import { supabaseAdmin } from "@/lib/supabase-admin";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailConfirmationCommande, type BilletEmail } from "@/lib/emails/confirmation-commande";
import QRCode from "qrcode";

interface PanierItem {
  ticket_type_id: string;
  quantite: number;
}

export type ResultatFinalisation =
  | "ok" // paiement validé, billets générés
  | "deja" // déjà finalisée (idempotent)
  | "montant" // le montant payé ne correspond pas au total
  | "introuvable";

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateHeure(dateISO: string, heure: string | null): string {
  const [annee, mois, jour] = dateISO.split("-");
  const d = `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
  if (!heure) return d;
  const [h, m] = heure.split(":");
  return `${d} · ${h}h${m}`;
}

/**
 * Envoie l'email de confirmation de commande (récap + billets avec QR).
 * Best-effort : n'importe quelle erreur ici est loguée et avalée, jamais
 * remontée — l'appelant (finaliserCommande) a déjà validé le paiement.
 */
async function envoyerConfirmationCommande(
  orderId: string,
  userId: string,
  eventId: string,
  panier: PanierItem[],
  sousTotal: number,
  fraisService: number,
  total: number,
  ticketsGeneres: { id: string; code_qr: string; ticket_type_id: string }[]
): Promise<void> {
  try {
    const [destinataire, { data: ev }, { data: types }] = await Promise.all([
      emailUtilisateur(userId),
      supabaseAdmin
        .from("events")
        .select("titre, date_debut, heure, lieu, ville")
        .eq("id", eventId)
        .maybeSingle(),
      supabaseAdmin.from("ticket_types").select("id, nom").in(
        "id",
        panier.map((p) => p.ticket_type_id)
      ),
    ]);
    if (!destinataire || !ev) return;

    const nomParId = new Map((types ?? []).map((t) => [t.id, t.nom]));

    const billets: BilletEmail[] = await Promise.all(
      ticketsGeneres.map(async (t) => ({
        nom: nomParId.get(t.ticket_type_id) ?? "Billet",
        qrDataUrl: await QRCode.toDataURL(t.code_qr, {
          margin: 1,
          width: 180,
          color: { dark: "#151009", light: "#ffffff" },
        }),
      }))
    );

    const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
    const { subject, html } = emailConfirmationCommande({
      numeroCommande: `#XWZ-${orderId.slice(0, 8).toUpperCase()}`,
      titreEvenement: ev.titre,
      dateHeureEvenement: formatDateHeure(ev.date_debut, ev.heure),
      lieu: ev.lieu,
      ville: ev.ville,
      billets,
      sousTotal,
      frais: fraisService,
      total,
      lienBillets: `${origine}/confirmation?order=${orderId}`,
    });

    await envoyerEmail({ to: destinataire, subject, html });
  } catch (e) {
    console.error("[commandes] échec envoi email confirmation :", e);
  }
}

/**
 * Finalise une commande payée, de façon IDEMPOTENTE :
 *  - refuse si le montant payé ≠ total en base ;
 *  - passe la commande en « paye » via un claim atomique (en_attente → paye) :
 *    un second appel (webhook rejoué) ne recrée pas les billets ;
 *  - génère les billets (code QR auto) depuis le panier ;
 *  - décrémente le stock (quantite_vendue += quantité) ;
 *  - envoie l'email de confirmation (best-effort, jamais bloquant).
 */
export async function finaliserCommande(
  orderId: string,
  montantPaye: number
): Promise<ResultatFinalisation> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, event_id, statut, total, sous_total, frais_service, panier")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return "introuvable";
  if (order.statut === "paye") return "deja";
  if (montantPaye !== order.total) return "montant";

  // Claim atomique : seul l'appel qui réussit cette transition crée les billets.
  const { data: claim } = await supabaseAdmin
    .from("orders")
    .update({ statut: "paye" })
    .eq("id", orderId)
    .eq("statut", "en_attente")
    .select("id");
  if (!claim || claim.length === 0) return "deja";

  const panier = (order.panier ?? []) as PanierItem[];

  // Génère un billet par unité
  const billets = panier.flatMap((p) =>
    Array.from({ length: p.quantite }, () => ({
      order_id: orderId,
      ticket_type_id: p.ticket_type_id,
    }))
  );
  let ticketsGeneres: { id: string; code_qr: string; ticket_type_id: string }[] = [];
  if (billets.length > 0) {
    const { data: inseres } = await supabaseAdmin
      .from("tickets")
      .insert(billets)
      .select("id, code_qr, ticket_type_id");
    ticketsGeneres = inseres ?? [];
  }

  // Décrémente le stock (incrémente quantite_vendue)
  const ids = panier.map((p) => p.ticket_type_id);
  if (ids.length > 0) {
    const { data: types } = await supabaseAdmin
      .from("ticket_types")
      .select("id, quantite_vendue")
      .in("id", ids);
    const venduParId = new Map(
      ((types ?? []) as { id: string; quantite_vendue: number }[]).map((t) => [
        t.id,
        t.quantite_vendue,
      ])
    );
    for (const p of panier) {
      await supabaseAdmin
        .from("ticket_types")
        .update({ quantite_vendue: (venduParId.get(p.ticket_type_id) ?? 0) + p.quantite })
        .eq("id", p.ticket_type_id);
    }
  }

  await envoyerConfirmationCommande(
    orderId,
    order.user_id,
    order.event_id,
    panier,
    order.sous_total,
    order.frais_service,
    order.total,
    ticketsGeneres
  );

  return "ok";
}

/** Retrouve une commande par son id de transaction FedaPay. */
export async function commandeParTransaction(
  transactionId: string
): Promise<{ id: string } | null> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("fedapay_transaction_id", transactionId)
    .maybeSingle();
  return data ?? null;
}
