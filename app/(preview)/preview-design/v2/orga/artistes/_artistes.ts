// Données factices des artistes de l'organisateur de la preview (« Ouidah Live », label).
// Schéma : supabase/migrations/20261001120000_artistes_abonnements.sql ; règles : design/ARTISTES.md.

export type StatutArtiste = "en_validation" | "valide" | "refuse";
export type TypeDemande = "label" | "auto_produit";

export type ArtisteOrga = {
  id: string;
  slug: string;
  nom: string;
  nomDemande?: string; // nom_scene_demande : changement de nom en vérification
  bio: string;
  photo: string | null;
  liens: Partial<Record<CleReseau, string>>;
  type: TypeDemande;
  statut: StatutArtiste;
  motifRefus?: string;
};

export type CleReseau = "instagram" | "facebook" | "tiktok" | "youtube" | "spotify" | "audiomack" | "boomplay" | "site";

/** Réseaux acceptés (design/ARTISTES.md), dans l'ordre d'affichage. */
export const RESEAUX: { cle: CleReseau; libelle: string; exemple: string }[] = [
  { cle: "instagram", libelle: "Instagram", exemple: "https://instagram.com/…" },
  { cle: "facebook", libelle: "Facebook", exemple: "https://facebook.com/…" },
  { cle: "tiktok", libelle: "TikTok", exemple: "https://tiktok.com/@…" },
  { cle: "youtube", libelle: "YouTube", exemple: "https://youtube.com/@…" },
  { cle: "spotify", libelle: "Spotify", exemple: "https://open.spotify.com/artist/…" },
  { cle: "audiomack", libelle: "Audiomack", exemple: "https://audiomack.com/…" },
  { cle: "boomplay", libelle: "Boomplay", exemple: "https://boomplay.com/artists/…" },
  { cle: "site", libelle: "Site web", exemple: "https://…" },
];

export const ARTISTES_ORGA: ArtisteOrga[] = [
  {
    id: "a1",
    slug: "zeynab-habib",
    nom: "Zeynab Habib",
    bio: "Voix du Bénin moderne, entre afro-pop et chants fon. Trois albums, des scènes de Cotonou à Paris.",
    photo: null,
    liens: { instagram: "https://instagram.com/zeynab", youtube: "https://youtube.com/@zeynab", audiomack: "https://audiomack.com/zeynab" },
    type: "label",
    statut: "valide",
  },
  {
    id: "a2",
    slug: "kemi-sound",
    nom: "Kemi Sound",
    bio: "",
    photo: null,
    liens: { tiktok: "https://tiktok.com/@kemisound" },
    type: "label",
    statut: "en_validation",
  },
  {
    id: "a3",
    slug: "dj-shado",
    nom: "DJ Shado",
    nomDemande: "Shado",
    bio: "DJ résident du Ganhi Rooftop, amapiano et afrohouse.",
    photo: null,
    liens: { instagram: "https://instagram.com/djshado" },
    type: "label",
    statut: "valide",
  },
  {
    id: "a4",
    slug: "les-tambours-dabomey",
    nom: "Les Tambours d'Abomey",
    bio: "",
    photo: null,
    liens: {},
    type: "label",
    statut: "refuse",
    motifRefus: "Nous n'avons pas pu joindre le groupe pour confirmer le mandat du label. Écris-nous à contact@xwezan.com.",
  },
];

export const artisteOrga = (id: string) => ARTISTES_ORGA.find((a) => a.id === id);

export function initialesArtiste(nom: string) {
  return nom
    .split(/\s+/)
    .filter((m) => /[A-Za-zÀ-ÿ0-9]/.test(m[0] ?? ""))
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");
}
