import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aujourdhuiPortoNovo, ajouterJours } from "@/lib/date";

/** Délai (jours) après la tenue de l'événement avant qu'un virement soit demandable. */
export const DELAI_PAYOUT_JOURS = 3;

/**
 * Dates d'un événement nécessaires au calcul du J+3. `date_reference_virement`
 * est obligatoire : tout appelant doit la sélectionner, sinon TypeScript refuse.
 */
export type DatesPayout = { date_debut: string; date_fin?: string | null; date_reference_virement: string };

/**
 * Date (YYYY-MM-DD, Africa/Porto-Novo) à partir de laquelle un virement peut
 * être demandé : la plus tardive entre `date_reference_virement` et la date
 * actuelle de l'événement (date_fin, sinon date_debut), plus le délai.
 *
 * `date_reference_virement` est tenue par un trigger en base
 * (20260927120000_date_reference_virement.sql) : dès qu'une commande est
 * payée, elle ne peut plus reculer. Avancer la date d'un événement vendu ne
 * rapproche donc jamais le virement (design/BUGS_REFONTE.md, bug #2) ;
 * reporter l'événement le repousse bien.
 */
export function dateDisponibilitePayout(event: DatesPayout): string {
  const dateActuelle = event.date_fin ?? event.date_debut;
  const dateReference =
    event.date_reference_virement > dateActuelle ? event.date_reference_virement : dateActuelle;
  return ajouterJours(dateReference, DELAI_PAYOUT_JOURS);
}

/** true si le délai de J+3 après l'événement est atteint (comparaison en date Africa/Porto-Novo). */
export function payoutDisponible(event: DatesPayout): boolean {
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
