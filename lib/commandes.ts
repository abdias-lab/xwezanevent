import { supabaseAdmin } from "@/lib/supabase-admin";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailConfirmationCommande, type BilletEmail } from "@/lib/emails/confirmation-commande";
import { emailRecapitulatifBillets, type CommandeRecap } from "@/lib/emails/recapitulatif-billets";
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
 *
 * Destinataire résolu selon le type de commande (voir
 * supabase/migrations/20260804120000_achat_invite.sql) : via le compte
 * (auth.users, `userId`) pour un achat authentifié, ou directement
 * `acheteurEmail` pour un achat invité — jamais les deux à la fois.
 */
async function envoyerConfirmationCommande(
  orderId: string,
  userId: string | null,
  acheteurEmail: string | null,
  eventId: string,
  total: number,
  ticketsGeneres: { id: string; code_qr: string; ticket_type_id: string }[]
): Promise<boolean> {
  try {
    const idsTypes = Array.from(new Set(ticketsGeneres.map((t) => t.ticket_type_id)));
    const [destinataire, { data: ev }, { data: types }] = await Promise.all([
      userId ? emailUtilisateur(userId) : Promise.resolve(acheteurEmail),
      supabaseAdmin
        .from("events")
        .select("titre, date_debut, heure, lieu, ville, pays_code")
        .eq("id", eventId)
        .maybeSingle(),
      supabaseAdmin.from("ticket_types").select("id, nom").in("id", idsTypes),
    ]);
    if (!destinataire || !ev) return false;

    const nomParId = new Map((types ?? []).map((t) => [t.id, t.nom]));

    // QR intégré en pièce jointe inline (CID), jamais en data-URI base64 :
    // Gmail et de nombreux autres clients mail bloquent les images
    // data:-URI dans le src d'un <img>, ce qui casse l'affichage du QR.
    const qrPngParTicket = await Promise.all(
      ticketsGeneres.map((t) =>
        QRCode.toBuffer(t.code_qr, {
          type: "png",
          margin: 1,
          width: 180,
          color: { dark: "#151009", light: "#ffffff" },
        })
      )
    );

    const billets: BilletEmail[] = ticketsGeneres.map((t) => ({
      nom: nomParId.get(t.ticket_type_id) ?? "Billet",
      qrCid: `qr-${t.id}`,
    }));
    const piecesJointes = ticketsGeneres.map((t, i) => ({
      filename: `billet-${t.id.slice(0, 8)}.png`,
      content: qrPngParTicket[i],
      contentId: `qr-${t.id}`,
    }));

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
      paysCode: ev.pays_code,
    });

    return await envoyerEmail({ to: destinataire, subject, html, attachments: piecesJointes });
  } catch (e) {
    console.error("[commandes] échec envoi email confirmation :", e);
    return false;
  }
}

/**
 * Envoie UN SEUL email récapitulatif regroupant TOUTES les commandes payées
 * données (avec leurs billets QR actuels — pas seulement ceux fraîchement
 * générés au paiement), plutôt qu'un email par commande — utilisé par
 * "Retrouver mon billet" (app/api/billets/retrouver), où un même acheteur
 * peut avoir plusieurs commandes payées. Ignore silencieusement toute
 * commande non payée ou sans billet valide (exclut les annulés, ex.
 * événement annulé depuis) : si aucune commande n'a de billet à montrer,
 * aucun email n'est envoyé.
 *
 * `destinataireEmail` est fourni par l'appelant (l'email déjà utilisé pour
 * la recherche) plutôt que redérivé par commande : que la commande soit
 * liée à un compte ou à un invité, l'email de recherche est le bon
 * destinataire dans les deux cas.
 */
export async function envoyerRecapitulatifBillets(
  orderIds: string[],
  destinataireEmail: string
): Promise<boolean> {
  if (orderIds.length === 0) return false;
  try {
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("id, event_id, total")
      .in("id", orderIds)
      .eq("statut", "paye")
      .order("created_at", { ascending: false });
    if (!orders || orders.length === 0) return false;

    const commandes: CommandeRecap[] = [];
    const piecesJointes: { filename: string; content: Buffer; contentId: string }[] = [];
    const paysCodes = new Set<string>();

    for (const order of orders) {
      const { data: tickets } = await supabaseAdmin
        .from("tickets")
        .select("id, code_qr, ticket_type_id")
        .eq("order_id", order.id)
        .neq("statut", "annule");
      if (!tickets || tickets.length === 0) continue;

      const idsTypes = Array.from(new Set(tickets.map((t) => t.ticket_type_id)));
      const [{ data: ev }, { data: types }] = await Promise.all([
        supabaseAdmin
          .from("events")
          .select("titre, date_debut, heure, lieu, ville, pays_code")
          .eq("id", order.event_id)
          .maybeSingle(),
        supabaseAdmin.from("ticket_types").select("id, nom").in("id", idsTypes),
      ]);
      if (!ev) continue;
      paysCodes.add(ev.pays_code);

      const nomParId = new Map((types ?? []).map((t) => [t.id, t.nom]));

      // QR intégré en pièce jointe inline (CID), jamais en data-URI base64 :
      // Gmail et de nombreux autres clients mail bloquent les images
      // data:-URI dans le src d'un <img>, ce qui casse l'affichage du QR.
      const qrPngParTicket = await Promise.all(
        tickets.map((t) =>
          QRCode.toBuffer(t.code_qr, {
            type: "png",
            margin: 1,
            width: 180,
            color: { dark: "#151009", light: "#ffffff" },
          })
        )
      );
      tickets.forEach((t, i) => {
        piecesJointes.push({
          filename: `billet-${t.id.slice(0, 8)}.png`,
          content: qrPngParTicket[i],
          contentId: `qr-${t.id}`,
        });
      });

      commandes.push({
        numeroCommande: `#XWZ-${order.id.slice(0, 8).toUpperCase()}`,
        titreEvenement: ev.titre,
        dateHeureEvenement: formatDateHeure(ev.date_debut, ev.heure),
        lieu: ev.lieu,
        ville: ev.ville,
        billets: tickets.map((t) => ({
          nom: nomParId.get(t.ticket_type_id) ?? "Billet",
          qrCid: `qr-${t.id}`,
        })),
        total: order.total,
      });
    }

    if (commandes.length === 0) return false;

    // Lien générique vers "Retrouver mon billet" plutôt que /compte : un
    // même récapitulatif peut mélanger commandes de compte et commandes
    // invité (même email utilisé des deux côtés) — /compte ne montrerait
    // jamais les secondes, /billet fonctionne dans tous les cas.
    const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
    const { subject, html } = emailRecapitulatifBillets({
      commandes,
      lienBillets: `${origine}/billet`,
      // undefined si les commandes regroupées couvrent plusieurs pays (voir
      // le commentaire de RecapitulatifBilletsData.paysCode) — repli sur
      // Bénin dans enveloppeEmail plutôt que d'inventer un pays.
      paysCode: paysCodes.size === 1 ? Array.from(paysCodes)[0] : undefined,
    });

    return await envoyerEmail({ to: destinataireEmail, subject, html, attachments: piecesJointes });
  } catch (e) {
    console.error("[commandes] échec envoi récapitulatif billets :", e);
    return false;
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
    .select("id, user_id, acheteur_email, event_id, statut, total, sous_total, frais_service, panier")
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
    order.acheteur_email,
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
