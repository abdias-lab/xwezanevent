"use server";

import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creerTransaction, genererLienPaiement } from "@/lib/fedapay";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

const FRAIS_TAUX = 0.06;

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

interface TicketTypeRow {
  id: string;
  prix: number;
  quantite_totale: number;
  quantite_vendue: number;
}

/**
 * Crée la commande et les billets pour la sélection courante.
 * - Exige un utilisateur authentifié (sinon redirection vers /connexion).
 * - Recalcule les prix côté serveur (Supabase = source de vérité).
 * - Écrit via service_role (les policies RLS bloquent l'écriture directe).
 * - statut='en_attente' : la charge FedaPay réelle est l'étape suivante.
 */
export async function payer(formData: FormData) {
  const slug = String(formData.get("ev") || "");
  const moyen = String(formData.get("moyen") || "mtn");
  const entrees = formData.getAll("t").map(String);

  // Lien de retour vers ce paiement (préserve la sélection)
  const paramsRetour = new URLSearchParams({ ev: slug });
  entrees.forEach((e) => paramsRetour.append("t", e));
  const urlPaiement = `/paiement?${paramsRetour.toString()}`;

  // 1. Authentification requise
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/connexion?redirect=${encodeURIComponent(urlPaiement)}`);
  }

  // 2. Événement publié + types de billets (prix de référence + quotas)
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, ticket_types(id, prix, quantite_totale, quantite_vendue)")
    .eq("slug", slug)
    .eq("statut", "publie")
    .maybeSingle();
  if (!ev) redirect("/evenements");

  const parId = new Map<string, TicketTypeRow>(
    (ev.ticket_types as TicketTypeRow[]).map((t) => [t.id, t])
  );

  // 3. Validation de la sélection (quantités bornées à la dispo)
  const selection: { tt: TicketTypeRow; qte: number }[] = [];
  for (const entree of entrees) {
    const [id, qStr] = entree.split(":");
    const tt = parId.get(id);
    const q = parseInt(qStr, 10);
    if (!tt || !Number.isFinite(q) || q <= 0) continue;
    const dispo = tt.quantite_totale - tt.quantite_vendue;
    const qte = Math.min(q, dispo);
    if (qte > 0) selection.push({ tt, qte });
  }
  if (selection.length === 0) redirect(urlPaiement);

  const sousTotal = selection.reduce((s, l) => s + l.tt.prix * l.qte, 0);
  const frais = Math.round(sousTotal * FRAIS_TAUX);
  const total = sousTotal + frais;

  // 4. Commande (service_role)
  const { data: order, error: errOrder } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: user.id,
      event_id: ev.id,
      sous_total: sousTotal,
      frais_service: frais,
      total,
      statut: "en_attente",
      moyen_paiement: moyen,
    })
    .select("id")
    .single();
  if (errOrder || !order) {
    throw new Error(`Création commande impossible : ${errOrder?.message}`);
  }

  // 5. Billets (un par unité)
  const lignesTickets = selection.flatMap((l) =>
    Array.from({ length: l.qte }, () => ({
      order_id: order.id,
      ticket_type_id: l.tt.id,
    }))
  );
  const { error: errTickets } = await supabaseAdmin
    .from("tickets")
    .insert(lignesTickets);
  if (errTickets) {
    throw new Error(`Création billets impossible : ${errTickets.message}`);
  }

  // 6. Initialisation du paiement FedaPay (le quota vendu est incrémenté
  //    seulement après confirmation du paiement, dans /paiement/retour).
  let lienPaiement: string | null = null;
  try {
    const nom = (user.user_metadata?.nom as string | undefined) ?? "";
    const [firstname, ...reste] = nom.trim().split(" ");
    const transaction = await creerTransaction({
      description: `Commande ${order.id.slice(0, 8)} — XwézanEvent`,
      montant: total,
      callbackUrl: `${origine()}/paiement/retour?order=${order.id}`,
      client: {
        firstname: firstname || undefined,
        lastname: reste.join(" ") || undefined,
        email: user.email ?? undefined,
      },
    });
    await supabaseAdmin
      .from("orders")
      .update({ fedapay_transaction_id: String(transaction.id) })
      .eq("id", order.id);
    lienPaiement = await genererLienPaiement(transaction.id);
  } catch (e) {
    console.error("[fedapay] initialisation du paiement échouée :", e);
  }

  // 7. Redirection : checkout FedaPay si dispo, sinon confirmation (réservation)
  if (lienPaiement) redirect(lienPaiement);
  redirect(`/confirmation?order=${order.id}`);
}
