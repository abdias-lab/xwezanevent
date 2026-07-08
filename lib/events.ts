import { supabase } from "@/lib/supabase";

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
  image: string;
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
    image: ev.affiche_url ?? "/images/vodun-days.jpg",
    href: `/evenement/${ev.slug}`,
  };
}

/**
 * Événements publiés + prix du ticket_type le moins cher (« à partir de »),
 * triés par date croissante. Filtre optionnel par catégorie.
 */
export async function getEvenementsPublies(
  opts: { categorie?: string } = {}
): Promise<CarteData[]> {
  let query = supabase
    .from("events")
    .select(
      "slug, titre, categorie, ville, lieu, date_debut, affiche_url, ticket_types(prix)"
    )
    .eq("statut", "publie");

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

/** Liste distincte des catégories présentes parmi les événements publiés. */
export async function getCategoriesPubliees(): Promise<string[]> {
  const { data, error } = await supabase
    .from("events")
    .select("categorie")
    .eq("statut", "publie");

  if (error || !data) return [];

  const set = new Set<string>();
  for (const row of data as { categorie: string | null }[]) {
    if (row.categorie) set.add(row.categorie);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}
