import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Abonnements aux artistes (design/ARTISTES.md, lot 3 ; schéma :
 * 20261001120000_artistes_abonnements.sql). Avec compte uniquement. Lecture
 * et écriture via service_role : la table n'a aucun droit client.
 * `jeton_desabonnement` (un par abonnement) sert au lien de désabonnement en
 * un clic de chaque e-mail, sans connexion.
 */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Artiste validé (seul un artiste en ligne peut être suivi), ou null. */
async function artisteEnLigne(artisteId: string): Promise<{ id: string; slug: string } | null> {
  if (!UUID.test(artisteId)) return null;
  const { data } = await supabaseAdmin.from("artistes").select("id, slug").eq("id", artisteId).eq("statut", "valide").maybeSingle();
  return data;
}

export async function estAbonne(userId: string, artisteId: string): Promise<boolean> {
  if (!UUID.test(artisteId)) return false;
  const { data } = await supabaseAdmin.from("abonnements").select("id").eq("user_id", userId).eq("artiste_id", artisteId).maybeSingle();
  return !!data;
}

/**
 * S'abonner, idempotent : un double clic ne crée pas de doublon. Insertion
 * simple, pas d'upsert : l'index unique (user_id, artiste_id) est partiel
 * (WHERE artiste_id IS NOT NULL) et PostgreSQL refuse de s'en servir pour un
 * ON CONFLICT sans ce prédicat. Le doublon (23505) compte comme un succès.
 */
export async function abonner(userId: string, artisteId: string): Promise<{ slug: string } | { erreur: "introuvable" | "serveur" }> {
  const a = await artisteEnLigne(artisteId);
  if (!a) return { erreur: "introuvable" };
  const { error } = await supabaseAdmin.from("abonnements").insert({ user_id: userId, artiste_id: a.id });
  if (error && error.code !== "23505") {
    console.error("[abonnements] abonnement :", error.message);
    return { erreur: "serveur" };
  }
  return { slug: a.slug };
}

/** Se désabonner (idempotent). */
export async function desabonner(userId: string, artisteId: string): Promise<boolean> {
  if (!UUID.test(artisteId)) return false;
  const { error } = await supabaseAdmin.from("abonnements").delete().eq("user_id", userId).eq("artiste_id", artisteId);
  if (error) console.error("[abonnements] désabonnement :", error.message);
  return !error;
}

export async function nombreAbonnes(artisteId: string): Promise<number> {
  const { count } = await supabaseAdmin.from("abonnements").select("id", { count: "exact", head: true }).eq("artiste_id", artisteId);
  return count ?? 0;
}

/** Abonnements d'un compte (/compte), les plus récents d'abord. */
export async function abonnementsUtilisateur(userId: string): Promise<{ artisteId: string; nom: string; slug: string; photo: string | null }[]> {
  const { data, error } = await supabaseAdmin
    .from("abonnements")
    .select("created_at, artiste:artistes(id, nom_scene, slug, photo_url, statut)")
    .eq("user_id", userId)
    .not("artiste_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) console.error("[abonnements] lecture :", error.message);
  type Ligne = { artiste: { id: string; nom_scene: string; slug: string; photo_url: string | null; statut: string } | null };
  // Un artiste retiré (refusé après coup) n'est plus affiché : sa page n'existe plus.
  return ((data ?? []) as unknown as Ligne[]).flatMap((l) =>
    l.artiste && l.artiste.statut === "valide" ? [{ artisteId: l.artiste.id, nom: l.artiste.nom_scene, slug: l.artiste.slug, photo: l.artiste.photo_url }] : [],
  );
}

/** Abonnement désigné par le jeton d'un lien de désabonnement, ou null. */
export async function abonnementParJeton(jeton: string): Promise<{ artiste: string; slug: string | null } | null> {
  if (!UUID.test(jeton)) return null;
  const { data } = await supabaseAdmin.from("abonnements").select("artiste:artistes(nom_scene, slug, statut)").eq("jeton_desabonnement", jeton).maybeSingle();
  const a = (data as unknown as { artiste: { nom_scene: string; slug: string; statut: string } | null } | null)?.artiste;
  if (!data) return null;
  return { artiste: a?.nom_scene ?? "cet artiste", slug: a?.statut === "valide" ? a.slug : null };
}

/** Désabonnement par jeton (lien de l'e-mail, sans connexion). Idempotent : un jeton inconnu ou déjà utilisé n'est pas une erreur. */
export async function desabonnerParJeton(jeton: string): Promise<boolean> {
  if (!UUID.test(jeton)) return false;
  const { error } = await supabaseAdmin.from("abonnements").delete().eq("jeton_desabonnement", jeton);
  if (error) console.error("[abonnements] désabonnement par jeton :", error.message);
  return !error;
}
