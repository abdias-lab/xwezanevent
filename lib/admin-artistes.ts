import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur } from "@/lib/email";

/**
 * Outils communs au retrait, à la remise en ligne et à la suppression d'un
 * artiste par l'admin (20261009120000_retrait_artistes.sql).
 */

/** Nom figé de l'admin pour la trace : « Nom <e-mail> », lisible même si le compte disparaît. */
export async function nomAdminFige(adminId: string): Promise<string> {
  const [{ data: profil }, email] = await Promise.all([supabaseAdmin.from("profiles").select("nom").eq("id", adminId).maybeSingle(), emailUtilisateur(adminId)]);
  return [profil?.nom, email ? `<${email}>` : null].filter(Boolean).join(" ") || adminId;
}

/** Slugs des événements où l'artiste est rattaché, à lire AVANT une suppression (la cascade les efface). */
export async function slugsEvenementsArtiste(artisteId: string): Promise<string[]> {
  const { data } = await supabaseAdmin.from("evenement_artistes").select("evenement:events(slug)").eq("artiste_id", artisteId);
  return ((data ?? []) as unknown as { evenement: { slug: string } | null }[]).flatMap((l) => (l.evenement ? [l.evenement.slug] : []));
}

/** Page de l'artiste et pages de ses événements (section « Avec ») remises à jour. */
export function revaliderArtiste(slug: string, slugsEvenements: string[]) {
  revalidatePath(`/artiste/${slug}`);
  for (const s of slugsEvenements) revalidatePath(`/evenement/${s}`);
  revalidatePath("/admin/artistes");
}
