import { supabase } from "@/lib/supabase";
import { aujourdhuiPortoNovo, plagePeriode } from "@/lib/date";

const MOIS_COURTS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

interface EventRow {
  slug: string;
  titre: string;
  categorie: string | null;
  ville: string;
  lieu: string;
  date_debut: string; // YYYY-MM-DD
  affiche_url: string | null;
  est_demo: boolean;
  ticket_types: { prix: number }[];
}

/** Données prêtes à passer à <CarteEvenement /> */
export interface CarteData {
  id: string;
  titre: string;
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

function mapRow(ev: EventRow): CarteData {
  const [, mois, jour] = ev.date_debut.split("-");
  const prix = ev.ticket_types.length
    ? Math.min(...ev.ticket_types.map((t) => t.prix))
    : 0;

  return {
    id: ev.slug,
    titre: ev.titre,
    categorie: ev.categorie ?? "Événement",
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
 * Événements publiés + prix du ticket_type le moins cher (« à partir de »),
 * triés par date croissante. Filtres optionnels : catégorie, période
 * ("quand" : aujourdhui, week-end, semaine, mois — voir plagePeriode()),
 * recherche texte (q, sur titre+description) et ville (saisie libre,
 * correspondance partielle).
 *
 * Exclut les événements dont la date est passée par une comparaison de
 * date directe (pas seulement `statut = 'publie'`) : reste correct même
 * si cloturer_evenements_passes()/pg_cron n'est pas encore passé sur cet
 * événement (voir supabase/migrations/20260712120000_evenements_termines.sql).
 */
export async function getEvenementsPublies(
  opts: { categorie?: string; quand?: string; q?: string; ville?: string } = {}
): Promise<CarteData[]> {
  const periode = plagePeriode(opts.quand);

  let query = supabase
    .from("events")
    .select(
      "slug, titre, categorie, ville, lieu, date_debut, affiche_url, est_demo, ticket_types(prix)"
    )
    .eq("statut", "publie")
    .gte("date_debut", periode ? periode.debut : aujourdhuiPortoNovo());

  if (periode) {
    query = query.lte("date_debut", periode.fin);
  }

  if (opts.categorie) {
    query = query.eq("categorie", opts.categorie);
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
  return (data as EventRow[]).map(mapRow);
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
  categorie: string | null;
  ville: string;
  lieu: string;
  date_debut: string;
  heure: string | null;
  affiche_url: string | null;
  /** true si l'événement est passé (date_debut < aujourd'hui, ou statut déjà 'termine') */
  estTermine: boolean;
  /** Nom public de l'organisateur (profiles.nom, seule colonne accordée à anon/public sur profiles). */
  organisateurNom: string | null;
  /** Événement vitrine (démo) : billetterie désactivée côté serveur, voir /api/orders. */
  estDemo: boolean;
  ticketTypes: TicketTypeDetail[];
}

interface EventDetailRow {
  slug: string;
  titre: string;
  description: string | null;
  categorie: string | null;
  ville: string;
  lieu: string;
  date_debut: string;
  heure: string | null;
  affiche_url: string | null;
  statut: string;
  est_demo: boolean;
  organisateur: { nom: string } | null;
  ticket_types: {
    id: string;
    nom: string;
    prix: number;
    quantite_totale: number;
    quantite_vendue: number;
  }[];
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
 */
export async function getEvenementParSlug(
  slug: string
): Promise<EvenementDetail | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "slug, titre, description, categorie, ville, lieu, date_debut, heure, affiche_url, statut, est_demo, organisateur:profiles(nom), ticket_types(id, nom, prix, quantite_totale, quantite_vendue)"
    )
    .eq("slug", slug)
    .in("statut", ["publie", "termine"])
    .maybeSingle();

  if (error) {
    console.error("[events] échec getEvenementParSlug :", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as EventDetailRow;
  const estTermine = row.statut === "termine" || row.date_debut < aujourdhuiPortoNovo();
  return {
    slug: row.slug,
    titre: row.titre,
    description: row.description,
    categorie: row.categorie,
    ville: row.ville,
    lieu: row.lieu,
    date_debut: row.date_debut,
    heure: row.heure,
    affiche_url: row.affiche_url,
    estTermine,
    organisateurNom: row.organisateur?.nom ?? null,
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

/** Liste distincte des catégories présentes parmi les événements publiés. */
export async function getCategoriesPubliees(): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("categorie")
    .eq("statut", "publie")
    .gte("date_debut", aujourdhuiPortoNovo());

  if (error || !data) return [];

  const set = new Set<string>();
  for (const row of data as { categorie: string | null }[]) {
    if (row.categorie) set.add(row.categorie);
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
 * statut 'publie' et date à venir — un événement coché mais passé, annulé
 * ou dépublié depuis ne peut jamais apparaître. Limité à LIMITE_TICKER dans
 * les deux branches pour rester lisible.
 */
export async function getEvenementsTicker(): Promise<TickerItem[]> {
  const aujourdhui = aujourdhuiPortoNovo();

  const { data: choisis, error: erreurChoisis } = await supabase
    .from("events")
    .select("id, titre, ville, date_debut")
    .eq("statut", "publie")
    .eq("mis_en_avant", true)
    .gte("date_debut", aujourdhui)
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
    .gte("date_debut", aujourdhui)
    .order("date_debut", { ascending: true })
    .limit(LIMITE_TICKER);

  if (erreurRepli || !repli) {
    if (erreurRepli) console.error("[events] échec getEvenementsTicker (repli) :", erreurRepli.message);
    return [];
  }
  return (repli as TickerRow[]).map(mapTicker);
}

/** Liste distincte des villes présentes parmi les événements publiés (pour suggestion, saisie libre par ailleurs). */
export async function getVillesPubliees(): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("ville")
    .eq("statut", "publie")
    .gte("date_debut", aujourdhuiPortoNovo());

  if (error || !data) return [];

  const set = new Set<string>();
  for (const row of data as { ville: string | null }[]) {
    if (row.ville) set.add(row.ville);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}
