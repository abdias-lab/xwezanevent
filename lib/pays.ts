import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export interface PaysOption {
  code: string;
  nom: string;
  drapeau: string;
}

/** Nom du cookie de contexte pays (voir components/SelecteurPays.tsx / lib/pays-action.ts). */
export const COOKIE_PAYS = "xwz_pays";

/** Pays par défaut si le cookie est absent — comportement actuel inchangé
 * pour tout visiteur n'ayant jamais touché au sélecteur. */
export const PAYS_DEFAUT = "bj";

/**
 * Pays actuellement parcouru (contexte de filtrage du catalogue public —
 * PAS le pays d'un événement individuel, voir events.pays_code). Lu côté
 * serveur uniquement (next/headers), jamais vide grâce à PAYS_DEFAUT.
 *
 * IMPORTANT — jamais utilisé pour la page détail d'un événement, le
 * checkout ou la confirmation : un lien direct vers un événement doit
 * toujours fonctionner, quel que soit le pays actuellement sélectionné
 * par la personne qui clique dessus (voir getEvenementParSlug dans
 * lib/events.ts, volontairement non filtré par pays).
 */
export function getPaysActuel(): string {
  return cookies().get(COOKIE_PAYS)?.value || PAYS_DEFAUT;
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
