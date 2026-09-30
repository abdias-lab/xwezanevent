// Passage des lignes du listing (lib/events.ts, CarteData) aux données de la
// carte V2. Module neutre : utilisable par les pages serveur (catalogue,
// accueil) comme par les composants client.
import type { CarteData } from "@/lib/events";
import { dateCarte, jour, jourSemaine, mois, type EvenementCarte } from "./evenement";

export function versCarte(e: CarteData): EvenementCarte {
  return {
    slug: e.id,
    titre: e.titre,
    categorie: e.categorie,
    lieu: e.nomLieu,
    ville: e.ville,
    debut: e.dateDebut,
    fin: e.dateFin ?? undefined,
    heure: e.heure ?? "",
    prixMin: e.prix,
    organisateur: "",
    tags: e.categories,
    image: e.image,
    restantes: e.restantes ?? undefined,
  };
}

/** « sam 3 oct. » */
export function libelleJour(d: string) {
  return `${jourSemaine(d).replace(".", "")} ${Number(jour(d))} ${mois(d)}`;
}

/** En-tête de groupe : « sam 3 oct. » pour un jour, « 2–4 oct. » pour un festival (qui forme son propre groupe). */
export function libelleGroupe(e: CarteData) {
  if (e.dateFin) return dateCarte({ debut: e.dateDebut, fin: e.dateFin });
  return libelleJour(e.dateDebut);
}
