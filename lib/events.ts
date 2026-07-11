import { supabase } from "@/lib/supabase";
import { aujourdhuiPortoNovo } from "@/lib/date";

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
  };
}

/**
 * Événements publiés + prix du ticket_type le moins cher (« à partir de »),
 * triés par date croissante. Filtre optionnel par catégorie.
 *
 * Exclut les événements dont la date est passée par une comparaison de
 * date directe (pas seulement `statut = 'publie'`) : reste correct même
 * si cloturer_evenements_passes()/pg_cron n'est pas encore passé sur cet
 * événement (voir supabase/migrations/20260712120000_evenements_termines.sql).
 */
export async function getEvenementsPublies(
  opts: { categorie?: string } = {}
): Promise<CarteData[]> {
  let query = supabase
    .from("events")
    .select(
      "slug, titre, categorie, ville, lieu, date_debut, affiche_url, ticket_types(prix)"
    )
    .eq("statut", "publie")
    .gte("date_debut", aujourdhuiPortoNovo());

  if (opts.categorie) {
    query = query.eq("categorie", opts.categorie);
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
      "slug, titre, description, categorie, ville, lieu, date_debut, heure, affiche_url, statut, ticket_types(id, nom, prix, quantite_totale, quantite_vendue)"
    )
    .eq("slug", slug)
    .in("statut", ["publie", "termine"])
    .maybeSingle();

  if (error) {
    console.error("[events] échec getEvenementParSlug :", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as EventDetailRow;
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
