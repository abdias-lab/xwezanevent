import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creerTransactionEtLien } from "@/lib/fedapay";
import { aujourdhuiPortoNovo } from "@/lib/date";

interface ItemSaisi {
  id: string;
  qte: number;
}
interface TicketTypeRow {
  id: string;
  nom: string;
  prix: number;
  quantite_totale: number;
  quantite_vendue: number;
}

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Crée une commande + initialise le paiement FedaPay.
 * - Prix et stock recalculés/validés CÔTÉ SERVEUR (jamais le front).
 * - Modèle économique : l'acheteur paie EXACTEMENT le prix affiché du
 *   billet (aucun frais de service ajouté par XwézanEvent — seuls les
 *   frais Mobile Money éventuels de FedaPay s'appliquent, hors de notre
 *   contrôle). La commission XwézanEvent (6%) est prélevée côté
 *   organisateur, au moment du reversement (voir lib/payouts.ts).
 * - Commande créée en « en_attente » avec un snapshot du panier.
 * - Les billets ne sont générés qu'après paiement (webhook / retour).
 */
export async function POST(req: NextRequest) {
  // 1. Authentification
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Connexion requise", redirect: "/connexion" },
      { status: 401 }
    );
  }

  // 2. Entrée
  const body = await req.json().catch(() => null);
  const slug: string | undefined = body?.slug;
  const items: ItemSaisi[] = Array.isArray(body?.items) ? body.items : [];
  if (!slug || items.length === 0) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // 3. Événement publié + types de billets (source de vérité des prix/stock)
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, titre, date_debut, ticket_types(id, nom, prix, quantite_totale, quantite_vendue)")
    .eq("slug", slug)
    .eq("statut", "publie")
    .maybeSingle();
  if (!ev) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
  // Vérifié par DATE, pas seulement par statut : reste correct même si
  // cloturer_evenements_passes()/pg_cron n'est pas encore passé sur cet
  // événement (voir supabase/migrations/20260712120000_evenements_termines.sql).
  if (ev.date_debut < aujourdhuiPortoNovo()) {
    return NextResponse.json(
      { error: "Cet événement est terminé, la billetterie est fermée" },
      { status: 409 }
    );
  }
  const parId = new Map<string, TicketTypeRow>(
    (ev.ticket_types as TicketTypeRow[]).map((t) => [t.id, t])
  );

  // 4. Recalcul serveur + vérification du stock
  const panier: { ticket_type_id: string; nom: string; prix: number; quantite: number }[] = [];
  let sousTotal = 0;
  for (const it of items) {
    const tt = parId.get(it?.id);
    const q = Math.floor(Number(it?.qte));
    if (!tt || !Number.isFinite(q) || q <= 0) continue;
    const dispo = tt.quantite_totale - tt.quantite_vendue;
    if (q > dispo) {
      return NextResponse.json(
        { error: `Stock insuffisant pour « ${tt.nom} » (${dispo} restant)` },
        { status: 409 }
      );
    }
    panier.push({ ticket_type_id: tt.id, nom: tt.nom, prix: tt.prix, quantite: q });
    sousTotal += tt.prix * q;
  }
  if (panier.length === 0) {
    return NextResponse.json({ error: "Sélection vide" }, { status: 400 });
  }

  // L'acheteur paie exactement le prix des billets : pas de frais de
  // service XwézanEvent ajoutés. frais_service reste à 0 (colonne
  // conservée pour compat historique / traçabilité, plus jamais
  // alimentée depuis le 2026-07-12 — voir /tarifs).
  const total = sousTotal;

  // 5. Commande en attente (avec snapshot du panier)
  const { data: order, error: errOrder } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: user.id,
      event_id: ev.id,
      sous_total: sousTotal,
      frais_service: 0,
      total,
      statut: "en_attente",
      panier,
    })
    .select("id")
    .single();
  if (errOrder || !order) {
    return NextResponse.json(
      { error: `Création de la commande impossible` },
      { status: 500 }
    );
  }

  // 6. Transaction FedaPay + lien de paiement
  const nom = (user.user_metadata?.nom as string | undefined) ?? "";
  const [firstname, ...reste] = nom.trim().split(" ");
  try {
    const { id: trxId, url } = await creerTransactionEtLien({
      description: `Commande ${order.id.slice(0, 8)} — ${ev.titre}`,
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
      .update({ fedapay_transaction_id: String(trxId) })
      .eq("id", order.id);
    return NextResponse.json({ url, orderId: order.id });
  } catch (e) {
    console.error("[api/orders] FedaPay :", e);
    return NextResponse.json(
      { error: "Paiement momentanément indisponible", orderId: order.id },
      { status: 502 }
    );
  }
}
