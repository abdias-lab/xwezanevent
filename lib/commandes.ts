import { supabaseAdmin } from "@/lib/supabase-admin";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailConfirmationCommande, type BilletEmail } from "@/lib/emails/confirmation-commande";
import { creerTransactionEtLien } from "@/lib/fedapay";
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

/**
 * Signature canonique d'un panier (triée par ticket_type_id, format
 * "id:quantite" joint par "|"), utilisée pour déduplication des commandes
 * en_attente. IMPORTANT : ce calcul DOIT rester identique au backfill SQL
 * dans supabase/migrations/20260720120000_dedoublonnage_commandes_en_attente.sql
 * — toute divergence romprait silencieusement la déduplication.
 */
export function signaturePanier(panier: PanierItem[]): string {
  return [...panier]
    .sort((a, b) => a.ticket_type_id.localeCompare(b.ticket_type_id))
    .map((p) => `${p.ticket_type_id}:${p.quantite}`)
    .join("|");
}

/**
 * Crée une nouvelle transaction FedaPay (+ lien de paiement) pour une
 * commande déjà existante et l'enregistre sur celle-ci — jamais de nouvelle
 * ligne `orders`. Utilisé aussi bien pour une commande fraîchement créée
 * que pour une relance (/api/orders/[id]/reessayer) ou la réutilisation
 * d'une commande en_attente récente sur double-clic (/api/orders).
 */
export async function creerTransactionPourCommande(params: {
  orderId: string;
  eventTitre: string;
  total: number;
  callbackUrl: string;
  client: { firstname?: string; lastname?: string; email?: string };
}): Promise<{ url: string }> {
  const { id: trxId, url } = await creerTransactionEtLien({
    description: `Commande ${params.orderId.slice(0, 8)} — ${params.eventTitre}`,
    montant: params.total,
    callbackUrl: params.callbackUrl,
    client: params.client,
  });
  await supabaseAdmin
    .from("orders")
    .update({ fedapay_transaction_id: String(trxId) })
    .eq("id", params.orderId);
  return { url };
}

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
 * Envoie (ou renvoie) l'email de confirmation de commande (récap + billets
 * avec QR) pour des billets déjà en base. Best-effort : n'importe quelle
 * erreur ici est loguée et avalée, jamais remontée. Retourne true si
 * l'email a effectivement été envoyé.
 */
async function envoyerConfirmationCommande(
  orderId: string,
  userId: string,
  eventId: string,
  total: number,
  ticketsGeneres: { id: string; code_qr: string; ticket_type_id: string }[]
): Promise<boolean> {
  try {
    const idsTypes = Array.from(new Set(ticketsGeneres.map((t) => t.ticket_type_id)));
    const [destinataire, { data: ev }, { data: types }] = await Promise.all([
      emailUtilisateur(userId),
      supabaseAdmin
        .from("events")
        .select("titre, date_debut, heure, lieu, ville")
        .eq("id", eventId)
        .maybeSingle(),
      supabaseAdmin.from("ticket_types").select("id, nom").in("id", idsTypes),
    ]);
    if (!destinataire || !ev) return false;

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
      total,
      lienBillets: `${origine}/confirmation?order=${orderId}`,
    });

    return await envoyerEmail({ to: destinataire, subject, html });
  } catch (e) {
    console.error("[commandes] échec envoi email confirmation :", e);
    return false;
  }
}

/**
 * Renvoie l'email de confirmation (récap + billets QR) d'une commande déjà
 * payée, à partir de ses tickets actuels en base (pas seulement ceux
 * fraîchement générés au paiement) — utilisé par "Retrouver mon billet"
 * (app/api/billets/retrouver). Ne renvoie que les billets encore valides
 * (exclut les billets annulés, ex. événement annulé depuis).
 */
export async function renvoyerConfirmationCommande(orderId: string): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, event_id, total, statut")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.statut !== "paye") return false;

  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("id, code_qr, ticket_type_id")
    .eq("order_id", orderId)
    .neq("statut", "annule");
  if (!tickets || tickets.length === 0) return false;

  return envoyerConfirmationCommande(order.id, order.user_id, order.event_id, order.total, tickets);
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

  // Réserve le stock de façon atomique (UPDATE conditionnel en base, voir
  // migration 20260717160000) AVANT de générer le moindre billet : deux
  // commandes concurrentes sur le même dernier billet ne peuvent plus
  // toutes les deux réussir. Le paiement est déjà capturé à ce stade (on
  // est appelé depuis le webhook FedaPay) : si la réservation échoue
  // malgré le contrôle de stock fait à la création de la commande (cas
  // extrêmement rare de course serrée), le ou les billets correspondants
  // ne sont pas émis — remboursement/traitement manuel requis, journalisé
  // en erreur pour intervention.
  const panierReserve: PanierItem[] = [];
  for (const p of panier) {
    const { data: ok, error } = await supabaseAdmin.rpc("reserver_stock_billet", {
      p_ticket_type_id: p.ticket_type_id,
      p_quantite: p.quantite,
    });
    if (error) {
      console.error(
        `[commandes] échec réservation stock (ticket_type=${p.ticket_type_id}, commande=${orderId}) :`,
        error.message
      );
      continue;
    }
    if (ok) {
      panierReserve.push(p);
    } else {
      console.error(
        `[commandes] SURVENTE ÉVITÉE — stock insuffisant pour ticket_type=${p.ticket_type_id} ` +
          `(commande=${orderId} déjà payée, ${p.quantite} billet(s) non émis, remboursement/traitement manuel requis)`
      );
    }
  }

  // Génère un billet par unité, uniquement pour le stock effectivement réservé
  const billets = panierReserve.flatMap((p) =>
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

  await envoyerConfirmationCommande(
    orderId,
    order.user_id,
    order.event_id,
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
