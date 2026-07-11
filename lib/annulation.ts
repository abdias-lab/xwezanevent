import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ResultatAnnulation =
  | { ok: true; titre: string; tickets_annules: number; payouts_geles: number }
  | { ok: false; raison: "introuvable" | "deja_annule" };

/**
 * Annule un événement (admin ou organisateur) via la fonction Postgres
 * annuler_evenement : transition events.statut -> 'annule', bascule les
 * billets valides en 'annule' (refusés au scan), gèle les demandes de
 * virement en attente de l'organisateur, et journalise — le tout de façon
 * atomique côté base.
 */
export async function annulerEvenement(
  eventId: string,
  acteurId: string,
  acteurRole: "admin" | "organisateur",
  motif?: string
): Promise<ResultatAnnulation> {
  const { data, error } = await supabaseAdmin.rpc("annuler_evenement", {
    p_event_id: eventId,
    p_acteur_id: acteurId,
    p_acteur_role: acteurRole,
    p_motif: motif ?? null,
  });

  if (error) {
    throw new Error(`Annulation impossible : ${error.message}`);
  }
  return data as ResultatAnnulation;
}
