import { cookies, headers } from "next/headers";
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
 * Pays deviné depuis la géolocalisation IP (en-tête posé par l'edge Vercel,
 * absent en dev local et sur tout hébergeur qui ne l'ajoute pas — ce n'est
 * qu'une meilleure estimation par défaut, jamais une source de vérité).
 * Retourne null si l'en-tête est absent ou si le pays détecté n'est pas
 * actif (comportement inchangé dans ce cas : repli sur PAYS_DEFAUT côté
 * appelant). Même validation que changerPays (lib/pays-action.ts) : le
 * code détecté n'est jamais fait confiance sans vérifier `actif` en base.
 */
async function detecterPaysParIP(): Promise<string | null> {
  const code = headers().get("x-vercel-ip-country")?.toLowerCase();
  if (!code) return null;

  const { data } = await supabase
    .from("pays")
    .select("code")
    .eq("code", code)
    .eq("actif", true)
    .maybeSingle();

  return data?.code ?? null;
}

/**
 * Pays actuellement parcouru (contexte de filtrage du catalogue public —
 * PAS le pays d'un événement individuel, voir events.pays_code). Le cookie
 * (choix manuel via SelecteurPays) prime toujours sur la géolocalisation :
 * une fois posé, il n'est plus jamais recalculé par IP tant qu'il n'est pas
 * changé à nouveau. Sans cookie (première visite), on tente la
 * géolocalisation IP avant de retomber sur PAYS_DEFAUT — jamais vide.
 *
 * IMPORTANT — jamais utilisé pour la page détail d'un événement, le
 * checkout ou la confirmation : un lien direct vers un événement doit
 * toujours fonctionner, quel que soit le pays actuellement sélectionné
 * (ou deviné par IP) pour la personne qui clique dessus (voir
 * getEvenementParSlug dans lib/events.ts, volontairement non filtré par
 * pays).
 */
export async function getPaysActuel(): Promise<string> {
  const cookiePays = cookies().get(COOKIE_PAYS)?.value;
  if (cookiePays) return cookiePays;

  const paysGeolocalise = await detecterPaysParIP();
  return paysGeolocalise ?? PAYS_DEFAUT;
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

/**
 * Adjectif démonymique (accord féminin) utilisé dans les textes marketing
 * du contexte de navigation (« la scène béninoise/togolaise »). Volontairement
 * en dur en TS plutôt qu'en colonne `pays` : même raisonnement que les
 * opérateurs Mobile Money (lib/telephone.ts) — un fait linguistique
 * structurel, qui ne change qu'au rythme de l'ajout d'un nouveau pays (donc
 * déjà un changement de code de toute façon), pas un levier business à
 * ajuster en base.
 */
export const ADJECTIF_PAR_PAYS: Record<string, string> = {
  bj: "béninoise",
  tg: "togolaise",
};

/**
 * Détail (code, nom, drapeau) du pays actuellement parcouru — pratique
 * partout où un texte doit afficher le NOM du pays (pas seulement filtrer
 * dessus), pour éviter de refaire `getPaysActifs().find(...)` à chaque
 * appelant. Repli sur PAYS_DEFAUT/'Bénin' si jamais le pays courant n'est
 * plus dans la liste des actifs (cookie périmé après désactivation d'un
 * pays, par exemple) — jamais de nom vide affiché.
 */
export async function getPaysActuelDetail(): Promise<PaysOption> {
  const [code, actifs] = await Promise.all([getPaysActuel(), getPaysActifs()]);
  return (
    actifs.find((p) => p.code === code) ?? {
      code: PAYS_DEFAUT,
      nom: "Bénin",
      drapeau: "🇧🇯",
    }
  );
}
