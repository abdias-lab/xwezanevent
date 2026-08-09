import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aujourdhuiPortoNovo, ajouterJours } from "@/lib/date";

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
 * Solde disponible au retrait pour un événement : revenu net (ventes de
 * billets moins la commission plateforme propre à CET événement — voir
 * events.taux_commission, 8% par défaut, ajustable au cas par cas pour un
 * accord commercial particulier) moins ce qui a déjà été demandé ou traité
 * pour cet événement. Les demandes 'bloque' (gelées suite à une annulation)
 * ne comptent plus contre le solde — l'événement étant annulé, il n'y a de
 * toute façon plus de nouvelle demande possible.
 */
export async function montantDisponible(eventId: string): Promise<number> {
  const [{ data: event }, { data: ticketTypes }] = await Promise.all([
    supabaseAdmin.from("events").select("taux_commission").eq("id", eventId).single(),
    supabaseAdmin.from("ticket_types").select("prix, quantite_vendue").eq("event_id", eventId),
  ]);

  const tauxCommission = Number(event?.taux_commission ?? 0.08);
  const revenuBrut = (ticketTypes ?? []).reduce(
    (s, t) => s + t.prix * t.quantite_vendue,
    0
  );
  const revenuNet = Math.round(revenuBrut * (1 - tauxCommission));

  const { data: payoutsExistants } = await supabaseAdmin
    .from("payouts")
    .select("montant")
    .eq("event_id", eventId)
    .in("statut", ["demande", "traite"]);

  const dejaDemande = (payoutsExistants ?? []).reduce((s, p) => s + p.montant, 0);

  return Math.max(0, revenuNet - dejaDemande);
}
