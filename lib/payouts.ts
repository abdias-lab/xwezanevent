import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const TAUX_COMMISSION = 0.06;
export const MOYENS_PAIEMENT = ["mtn", "moov"] as const;
export type MoyenPaiement = (typeof MOYENS_PAIEMENT)[number];

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
