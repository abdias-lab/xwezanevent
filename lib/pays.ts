import { supabase } from "@/lib/supabase";

export interface PaysOption {
  code: string;
  nom: string;
  drapeau: string;
}

/**
 * Pays actifs (voir supabase/migrations/20260805120000_multi_pays_evenements.sql),
 * triés pour affichage — alimente le sélecteur du formulaire de création
 * d'événement et, dans une étape suivante du chantier, le sélecteur du
 * catalogue public. Un pays inactif (ex. Togo tant que non lancé
 * commercialement) n'apparaît jamais ici, même si sa ligne existe déjà en
 * base.
 */
export async function getPaysActifs(): Promise<PaysOption[]> {
  const { data, error } = await supabase
    .from("pays")
    .select("code, nom, drapeau")
    .eq("actif", true)
    .order("ordre", { ascending: true });

  if (error) {
    console.error("[pays] échec getPaysActifs :", error.message);
    return [];
  }
  return data ?? [];
}
