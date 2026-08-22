"use server";

import { creerClientServeur } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const MAX_LONGUEUR_NOM_PUBLIC = 80;

/**
 * Nom affiché publiquement sur la page de chaque événement de
 * l'organisateur (« Organisé par »), distinct de son nom personnel
 * (profiles.nom, saisi une fois à l'inscription) — voir
 * 20260822120000_nom_public_organisateurs.sql.
 *
 * Écriture via le client de session (pas supabaseAdmin), volontairement :
 * la policy RLS "Users can update own profile info" (auth.uid() = id)
 * couvre déjà cette colonne, aucune restriction UPDATE colonne par colonne
 * n'a jamais existé sur `profiles` (contrairement à SELECT) — confirmé en
 * conditions réelles ici plutôt que supposé depuis la migration.
 */
export async function majNomPublic(formData: FormData) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/parametres");

  const saisi = String(formData.get("nom_public") || "")
    .trim()
    .slice(0, MAX_LONGUEUR_NOM_PUBLIC);
  const nom_public = saisi || null;

  const { error } = await supabase
    .from("profiles")
    .update({ nom_public })
    .eq("id", user.id);

  if (error) {
    console.error("[orga/parametres] échec mise à jour nom_public :", error.message);
    redirect("/orga/parametres?erreur=1");
  }

  // Le nom public apparaît sur la page de CHAQUE événement de cet
  // organisateur (lib/events.ts::getEvenementParSlug) — toutes doivent être
  // revalidées, pas seulement une.
  const { data: events } = await supabase
    .from("events")
    .select("slug")
    .eq("organisateur_id", user.id);
  for (const e of events ?? []) {
    revalidatePath(`/evenement/${e.slug}`);
  }

  revalidatePath("/orga/parametres");
  redirect("/orga/parametres?maj=1");
}
