import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface EvenementLienScan {
  id: string;
  titre: string;
}

/**
 * Résout un jeton de lien de scan délégué (voir
 * supabase/migrations/20260811120000_lien_scan_evenement.sql) vers son
 * événement — TOUJOURS via supabaseAdmin (service_role), jamais le client
 * anon : `events.lien_scan_token` n'est lisible par aucun rôle client, la
 * seule voie légitime de lecture est cette fonction, appelée depuis une
 * route serveur. Retourne null si le jeton est invalide, révoqué (colonne
 * NULL), ou régénéré depuis (l'ancien jeton ne correspond plus à rien).
 */
export async function resoudreEvenementParToken(
  token: string
): Promise<EvenementLienScan | null> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id, titre")
    .eq("lien_scan_token", token)
    .maybeSingle();

  if (error) {
    console.error("[scan-liens] échec résolution token :", error.message);
    return null;
  }
  return data;
}

export interface CompteurScan {
  scannes: number;
  total: number;
}

/**
 * Billets scannés / vendus pour UN événement — repère non financier affiché
 * à la personne qui scanne (voir ScannerClient), jamais de montant ni de
 * revenu. `total` = somme de quantite_vendue (billets réellement vendus,
 * pas la capacité totale) ; `scannes` = tickets déjà passés en 'utilise'.
 */
export async function compteurScan(eventId: string): Promise<CompteurScan> {
  const { data: ticketTypes } = await supabaseAdmin
    .from("ticket_types")
    .select("id, quantite_vendue")
    .eq("event_id", eventId);

  const idsTypes = (ticketTypes ?? []).map((t) => t.id);
  const total = (ticketTypes ?? []).reduce((s, t) => s + t.quantite_vendue, 0);

  if (idsTypes.length === 0) return { scannes: 0, total: 0 };

  const { count } = await supabaseAdmin
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .in("ticket_type_id", idsTypes)
    .eq("statut", "utilise");

  return { scannes: count ?? 0, total };
}
