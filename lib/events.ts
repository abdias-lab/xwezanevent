import { supabase } from "@/lib/supabase";
import { aujourdhuiPortoNovo, plagePeriode } from "@/lib/date";

const MOIS_COURTS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

interface EventRow {
  slug: string;
  titre: string;
  ville: string;
  lieu: string;
  date_debut: string; // YYYY-MM-DD
  affiche_url: string | null;
  est_demo: boolean;
  ticket_types: { prix: number }[];
  event_categories: { categorie: string; ordre: number }[];
}

/** Données prêtes à passer à <CarteEvenement /> */
export interface CarteData {
  id: string;
  titre: string;
  /** Catégorie principale (la première par ordre) — la carte n'affiche qu'un seul badge. */
  categorie: string;
  lieu: string;
  prix: number;
  jour: string;
  mois: string;
  image: string | null;
  href: string;
  /** Événement vitrine (démo) : billetterie désactivée côté serveur, voir /api/orders. */
  estDemo: boolean;
}

function categoriePrincipale(categories: { categorie: string; ordre: number }[]): string {
  return [...categories].sort((a, b) => a.ordre - b.ordre)[0]?.categorie ?? "Événement";
}

function mapRow(ev: EventRow): CarteData {
  const [, mois, jour] = ev.date_debut.split("-");
  const prix = ev.ticket_types.length
    ? Math.min(...ev.ticket_types.map((t) => t.prix))
    : 0;

  return {
    id: ev.slug,
    titre: ev.titre,
    categorie: categoriePrincipale(ev.event_categories),
    lieu: `${ev.lieu}, ${ev.ville}`,
    prix,
    jour,
    mois: MOIS_COURTS[parseInt(mois, 10) - 1] ?? "",
    image: ev.affiche_url,
    href: `/evenement/${ev.slug}`,
    estDemo: ev.est_demo,
  };
}

/** Échappe une valeur pour l'insérer dans un filtre .or() de PostgREST (guillemets = échappement des virgules/parenthèses). */
function echapperPourOr(valeur: string): string {
  return valeur.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Filtre PostgREST équivalent à COALESCE(date_fin, date_debut) >= depuis —
 * "l'événement n'est pas encore complètement terminé", vrai aussi bien pour
 * un événement d'un jour que pour un festival multi-jours encore en cours.
 * COALESCE n'étant pas un nom de colonne filtrable directement, exprimé en
 * OR : date_fin dépasse le seuil, OU (pas de date_fin ET date_debut dépasse
 * le seuil).
 *
 * JAMAIS de préfixe de table dans la chaîne elle-même : le parseur
 * "logic tree" de PostgREST rejette une notation `table.colonne` à
 * l'intérieur d'un `or=(...)` (confirmé en conditions réelles — testé le
 * 2026-08-23, `.or("events.date_debut...")` échoue avec "failed to parse
 * logic tree" même sans imbrication). Pour filtrer une table liée via
 * `events!inner(...)` (ex. `event_categories`), passer l'option
 * `{ referencedTable: "events" }` au `.or()` de l'appelant plutôt que de
 * préfixer la chaîne — voir getCategoriesPubliees/getCompteursCategories.
 */
export function filtreNonTermine(depuis: string): string {
  return `date_fin.gte.${depuis},and(date_fin.is.null,date_debut.gte.${depuis})`;
}

/**
 * Événements publiés + prix du ticket_type le moins cher (« à partir de »),
 * triés par date croissante. Filtres optionnels : catégorie (un événement
 * peut avoir plusieurs catégories — voir event_categories — il apparaît dans
 * le filtre dès qu'une seule correspond), période ("quand" : aujourdhui,
 * week-end, semaine, mois — voir plagePeriode()), recherche texte (q, sur
 * titre+description) et ville (saisie libre, correspondance partielle).
 *
 * Exclut les événements dont la date est passée par une comparaison de
 * date directe (pas seulement `statut = 'publie'`) : reste correct même
 * si cloturer_evenements_passes()/pg_cron n'est pas encore passé sur cet
 * événement (voir supabase/migrations/20260712120000_evenements_termines.sql).
 * Exclut aussi les événements vitrine/démo (est_demo) : ils restent
 * consultables par lien direct via getEvenementParSlug, mais ne doivent
 * apparaître dans aucun listing public.
 */
export async function getEvenementsPublies(
  opts: { categorie?: string; quand?: string; q?: string; ville?: string; pays: string }
): Promise<CarteData[]> {
  const periode = plagePeriode(opts.quand);

  // event_categories!inner (plutôt que la forme sans !inner) transforme le
  // filtre .eq ci-dessous en jointure restrictive sur les événements
  // eux-mêmes, pas seulement sur les lignes embarquées — nécessaire pour
  // qu'un événement sans la catégorie demandée soit exclu du résultat.
  const relationCategories = opts.categorie
    ? "event_categories!inner(categorie, ordre)"
    : "event_categories(categorie, ordre)";

  let query = supabase
    .from("events")
    .select(
      `slug, titre, ville, lieu, date_debut, affiche_url, est_demo, ticket_types(prix), ${relationCategories}`
    )
    .eq("statut", "publie")
    .eq("est_demo", false)
    .eq("pays_code", opts.pays)
    .or(filtreNonTermine(periode ? periode.debut : aujourdhuiPortoNovo()));

  if (periode) {
    query = query.lte("date_debut", periode.fin);
  }

  if (opts.categorie) {
    query = query.eq("event_categories.categorie", opts.categorie);
  }

  if (opts.ville?.trim()) {
    query = query.ilike("ville", `%${opts.ville.trim()}%`);
  }

  const motCle = opts.q?.trim();
  if (motCle) {
    const echappe = echapperPourOr(motCle);
    query = query.or(`titre.ilike."%${echappe}%",description.ilike."%${echappe}%"`);
  }

  const { data, error } = await query.order("date_debut", { ascending: true });

  if (error) {
    console.error("[events] échec de récupération :", error.message);
    return [];
  }
  return (data as unknown as EventRow[]).map(mapRow);
}

export interface TicketTypeDetail {
  id: string;
  nom: string;
  prix: number;
  disponibles: number;
}

export interface EvenementDetail {
  slug: string;
  titre: string;
  description: string | null;
  categories: string[];
  ville: string;
  lieu: string;
  date_debut: string;
  /** Date de fin pour un événement multi-jours (ex. festival) — null pour un événement d'un seul jour. */
  date_fin: string | null;
  heure: string | null;
  affiche_url: string | null;
  /** Pays de CET événement — jamais le contexte de navigation du visiteur (voir getEvenementParSlug). Détermine les opérateurs Mobile Money affichés au checkout. */
  paysCode: string;
  /** Toutes les images (principale incluse), triées par ordre d'affichage — pour le carrousel de la page événement. */
  images: { url: string; principale: boolean }[];
  /** true si l'événement est passé (date_fin si renseignée sinon date_debut < aujourd'hui, ou statut déjà 'termine') */
  estTermine: boolean;
  /** Nom affiché publiquement (profiles.nom_public si renseigné, sinon repli sur profiles.nom — voir 20260822120000_nom_public_organisateurs.sql). */
  organisateurNom: string | null;
  /** Événement vitrine (démo) : billetterie désactivée côté serveur, voir /api/orders. */
  estDemo: boolean;
  ticketTypes: TicketTypeDetail[];
}

interface EventDetailRow {
  slug: string;
  titre: string;
  description: string | null;
  ville: string;
  lieu: string;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  affiche_url: string | null;
  pays_code: string;
  statut: string;
  est_demo: boolean;
  organisateur: { nom: string; nom_public: string | null } | null;
  ticket_types: {
    id: string;
    nom: string;
    prix: number;
    quantite_totale: number;
    quantite_vendue: number;
  }[];
  event_categories: { categorie: string; ordre: number }[];
  event_images: { url: string; principale: boolean; ordre: number }[];
}

/**
 * Un événement publié ou terminé, détaillé (avec ses ticket_types), ou
 * null si absent/pas encore validé. Les événements 'termine' restent
 * consultables (voir RLS "Published and terminated events readable") pour
 * que la page reste accessible en direct par URL, avec la billetterie
 * remplacée par un message "Événement terminé" (estTermine).
 *
 * estTermine se base sur la DATE, pas seulement sur `statut`, pour rester
 * correct même si cloturer_evenements_passes()/pg_cron n'est pas encore
 * passé sur cet événement précis.
 *
 * VOLONTAIREMENT non filtré par pays (contrairement à getEvenementsPublies
 * et consorts, voir lib/pays.ts::getPaysActuel) : un lien direct vers un
 * événement doit toujours s'ouvrir, quel que soit le drapeau actuellement
 * sélectionné par la personne qui clique dessus — sinon un lien partagé
 * (ex. sur WhatsApp) casserait selon le contexte pays du destinataire. Le
 * pays ne sert qu'à filtrer les LISTINGS (accueil, /evenements), jamais
 * l'accès direct à un événement, au checkout ou à la confirmation.
 */
export async function getEvenementParSlug(
  slug: string
): Promise<EvenementDetail | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "slug, titre, description, ville, lieu, date_debut, date_fin, heure, affiche_url, pays_code, statut, est_demo, organisateur:profiles(nom, nom_public), ticket_types(id, nom, prix, quantite_totale, quantite_vendue), event_categories(categorie, ordre), event_images(url, principale, ordre)"
    )
    .eq("slug", slug)
    .in("statut", ["publie", "termine"])
    .order("ordre", { foreignTable: "event_categories", ascending: true })
    .order("ordre", { foreignTable: "event_images", ascending: true })
    .maybeSingle();

  if (error) {
    console.error("[events] échec getEvenementParSlug :", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as EventDetailRow;
  const estTermine =
    row.statut === "termine" || (row.date_fin ?? row.date_debut) < aujourdhuiPortoNovo();
  return {
    slug: row.slug,
    titre: row.titre,
    description: row.description,
    categories: row.event_categories.map((c) => c.categorie),
    ville: row.ville,
    lieu: row.lieu,
    date_debut: row.date_debut,
    date_fin: row.date_fin,
    heure: row.heure,
    affiche_url: row.affiche_url,
    paysCode: row.pays_code,
    images: row.event_images.map((i) => ({ url: i.url, principale: i.principale })),
    estTermine,
    organisateurNom: row.organisateur?.nom_public || row.organisateur?.nom || null,
    estDemo: row.est_demo,
    ticketTypes: row.ticket_types
      .map((t) => ({
        id: t.id,
        nom: t.nom,
        prix: t.prix,
        disponibles: Math.max(0, t.quantite_totale - t.quantite_vendue),
      }))
      .sort((a, b) => a.prix - b.prix),
  };
}

/** Liste distincte des catégories présentes parmi les événements publiés d'UN pays (hors vitrine/démo). */
export async function getCategoriesPubliees(pays: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("event_categories")
    .select("categorie, events!inner(statut, est_demo, date_debut, date_fin, pays_code)")
    .eq("events.statut", "publie")
    .eq("events.est_demo", false)
    .eq("events.pays_code", pays)
    .or(filtreNonTermine(aujourdhuiPortoNovo()), { referencedTable: "events" });

  if (error || !data) return [];

  const set = new Set<string>();
  for (const row of data as unknown as { categorie: string }[]) {
    set.add(row.categorie);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

export interface TickerItem {
  id: string;
  date: string;
  texte: string;
}

interface TickerRow {
  id: string;
  titre: string;
  ville: string;
  date_debut: string;
}

/** Nombre maximum d'événements affichés dans le ticker (lisibilité de la bande défilante). */
export const LIMITE_TICKER = 6;

function mapTicker(ev: TickerRow): TickerItem {
  const [, mois, jour] = ev.date_debut.split("-");
  return {
    id: ev.id,
    date: `${parseInt(jour, 10)} ${(MOIS_COURTS[parseInt(mois, 10) - 1] ?? "").toUpperCase()}`,
    texte: `${ev.titre} · ${ev.ville}`,
  };
}

/**
 * Événements affichés dans la bande défilante ("ticker") de l'accueil.
 * Sélection manuelle admin (mis_en_avant, triés par ordre_affiche puis date)
 * si au moins un événement éligible est coché ; sinon repli sur les
 * prochains événements publiés par date. Éligibilité dans les deux cas :
 * statut 'publie', date à venir et hors événements vitrine/démo — un
 * événement coché mais passé, annulé, dépublié ou démo ne peut jamais
 * apparaître. Limité à LIMITE_TICKER dans les deux branches pour rester
 * lisible.
 */
export async function getEvenementsTicker(pays: string): Promise<TickerItem[]> {
  const aujourdhui = aujourdhuiPortoNovo();

  const { data: choisis, error: erreurChoisis } = await supabase
    .from("events")
    .select("id, titre, ville, date_debut")
    .eq("statut", "publie")
    .eq("mis_en_avant", true)
    .eq("est_demo", false)
    .eq("pays_code", pays)
    .or(filtreNonTermine(aujourdhui))
    .order("ordre_affiche", { ascending: true, nullsFirst: false })
    .order("date_debut", { ascending: true })
    .limit(LIMITE_TICKER);

  if (erreurChoisis) {
    console.error("[events] échec getEvenementsTicker (choisis) :", erreurChoisis.message);
  } else if (choisis && choisis.length > 0) {
    return (choisis as TickerRow[]).map(mapTicker);
  }

  const { data: repli, error: erreurRepli } = await supabase
    .from("events")
    .select("id, titre, ville, date_debut")
    .eq("statut", "publie")
    .eq("est_demo", false)
    .eq("pays_code", pays)
    .or(filtreNonTermine(aujourdhui))
    .order("date_debut", { ascending: true })
    .limit(LIMITE_TICKER);

  if (erreurRepli || !repli) {
    if (erreurRepli) console.error("[events] échec getEvenementsTicker (repli) :", erreurRepli.message);
    return [];
  }
  return (repli as TickerRow[]).map(mapTicker);
}

/**
 * Nombre d'événements réels (statut 'publie', date à venir, hors événements
 * vitrine/démo) par catégorie — alimente les compteurs de la section
 * "Explorez par envie" de l'accueil. Un événement à plusieurs catégories
 * est compté une fois dans chacune. Une catégorie absente du résultat n'a
 * aucun événement réel à venir (compteur à masquer côté affichage).
 */
export async function getCompteursCategories(pays: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("event_categories")
    .select("categorie, events!inner(statut, est_demo, date_debut, date_fin, pays_code)")
    .eq("events.statut", "publie")
    .eq("events.est_demo", false)
    .eq("events.pays_code", pays)
    .or(filtreNonTermine(aujourdhuiPortoNovo()), { referencedTable: "events" });

  if (error || !data) {
    if (error) console.error("[events] échec getCompteursCategories :", error.message);
    return {};
  }

  const compteurs: Record<string, number> = {};
  for (const row of data as unknown as { categorie: string }[]) {
    compteurs[row.categorie] = (compteurs[row.categorie] ?? 0) + 1;
  }
  return compteurs;
}

/** Liste distincte des villes présentes parmi les événements publiés d'UN pays (hors vitrine/démo, pour suggestion, saisie libre par ailleurs). */
export async function getVillesPubliees(pays: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("ville")
    .eq("statut", "publie")
    .eq("est_demo", false)
    .eq("pays_code", pays)
    .or(filtreNonTermine(aujourdhuiPortoNovo()));

  if (error || !data) return [];

  const set = new Set<string>();
  for (const row of data as { ville: string | null }[]) {
    if (row.ville) set.add(row.ville);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Nombre d'événements réels (statut 'publie', date à venir, hors événements
 * vitrine/démo) par ville — alimente les compteurs de la section "Que faire
 * ce soir à…" de l'accueil. Clé normalisée (minuscule, espaces coupés) pour
 * absorber les variations de casse saisies par les organisateurs ; une ville
 * absente du résultat n'a aucun événement réel à venir (compteur à masquer
 * côté affichage).
 */
export async function getCompteursVilles(pays: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("events")
    .select("ville")
    .eq("statut", "publie")
    .eq("est_demo", false)
    .eq("pays_code", pays)
    .or(filtreNonTermine(aujourdhuiPortoNovo()));

  if (error || !data) {
    if (error) console.error("[events] échec getCompteursVilles :", error.message);
    return {};
  }

  const compteurs: Record<string, number> = {};
  for (const row of data as { ville: string | null }[]) {
    if (!row.ville) continue;
    const cle = row.ville.trim().toLowerCase();
    compteurs[cle] = (compteurs[cle] ?? 0) + 1;
  }
  return compteurs;
}
