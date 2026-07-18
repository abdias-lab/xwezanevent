import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aujourdhuiPortoNovo, ajouterJours } from "@/lib/date";

export const TAUX_COMMISSION = 0.06;
export const MOYENS_PAIEMENT = ["mtn", "moov", "celtiis"] as const;
export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number];

/**
 * Normalise un numéro Mobile Money béninois saisi par un organisateur
 * (donnée client, jamais de confiance) : tolère espaces/points/tirets et
 * l'indicatif +229, rejette tout ce qui ne correspond pas à un numéro
 * béninois valide. Format stocké : 10 chiffres, préfixe "01" (migration
 * ARCEP du 30 novembre 2024). Tolère aussi la saisie d'un ancien numéro à
 * 8 chiffres (habitude fréquente vu la récence de la migration) en lui
 * ajoutant automatiquement le préfixe "01" — la forme normalisée (donc
 * potentiellement complétée) est ensuite montrée à l'organisateur à
 * l'écran de récapitulatif, jamais stockée sans qu'il l'ait vue. Ne
 * vérifie pas la cohérence entre le préfixe et l'opérateur choisi
 * (moyen) — volontairement, pour ne pas rejeter à tort un numéro valide
 * sur la base d'une liste de préfixes non garantie à jour.
 */
export function normaliserNumeroBenin(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s().-]/g, "").replace(/^\+?229/, "");
  if (/^01\d{8}$/.test(nettoye)) return nettoye;
  if (/^\d{8}$/.test(nettoye)) return "01" + nettoye;
  return null;
}

/** Message d'erreur/aide unique pour le format de numéro, réutilisé
 * côté serveur (route) et client (formulaire) pour rester cohérent. */
export const AIDE_NUMERO_BENIN =
  "Le numéro doit comporter 10 chiffres et commencer par 01 — exemple : 01 97 12 34 56 (un numéro à 8 chiffres sans le 01 est aussi accepté, il sera complété automatiquement).";

/** Délai (jours) après la tenue de l'événement avant qu'un virement soit demandable. */
export const DELAI_PAYOUT_JOURS = 3;

/**
 * Date (YYYY-MM-DD, Africa/Porto-Novo) à partir de laquelle un virement peut
 * être demandé pour cet événement : date_fin + délai si `date_fin` existe un
 * jour (colonne absente du schéma actuel — confirmé par audit), sinon
 * date_debut + délai.
 */
export function dateDisponibilitePayout(event: { date_debut: string; date_fin?: string | null }): string {
  const dateReference = event.date_fin ?? event.date_debut;
  return ajouterJours(dateReference, DELAI_PAYOUT_JOURS);
}

/** true si le délai de J+3 après l'événement est atteint (comparaison en date Africa/Porto-Novo). */
export function payoutDisponible(event: { date_debut: string; date_fin?: string | null }): boolean {
  return aujourdhuiPortoNovo() >= dateDisponibilitePayout(event);
}

/**
 * Solde disponible au retrait pour un événement : revenu net (94% des
 * ventes de billets, après commission plateforme) moins ce qui a déjà été
 * demandé ou traité pour cet événement. Les demandes 'bloque' (gelées suite
 * à une annulation) ne comptent plus contre le solde — l'événement étant
 * annulé, il n'y a de toute façon plus de nouvelle demande possible.
 */
export async function montantDisponible(eventId: string): Promise<number> {
  const { data: ticketTypes } = await supabaseAdmin
    .from("ticket_types")
    .select("prix, quantite_vendue")
    .eq("event_id", eventId);

  const revenuBrut = (ticketTypes ?? []).reduce(
    (s, t) => s + t.prix * t.quantite_vendue,
    0
  );
  const revenuNet = Math.round(revenuBrut * (1 - TAUX_COMMISSION));

  const { data: payoutsExistants } = await supabaseAdmin
    .from("payouts")
    .select("montant")
    .eq("event_id", eventId)
    .in("statut", ["demande", "traite"]);

  const dejaDemande = (payoutsExistants ?? []).reduce((s, p) => s + p.montant, 0);

  return Math.max(0, revenuNet - dejaDemande);
}
