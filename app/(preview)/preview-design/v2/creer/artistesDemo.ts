// Recherche factice du sélecteur d'artistes (preview). En prod : chercherArtistes
// (app/(orga)/creer/actions.ts) → rechercherArtistes (lib/artistes.ts).
import { ARTISTES_ORGA } from "../orga/artistes/_artistes";
import type { ArtisteTrouve } from "./Artistes";

/** Artistes validés d'autres comptes : rattachement « proposé ». */
const AUTRES: ArtisteTrouve[] = [
  { id: "x1", nom: "Ayaba Sounds", photo: null, statut: "valide", gere: false },
  { id: "x2", nom: "Sèna Melody", photo: null, statut: "valide", gere: false },
  { id: "x3", nom: "Kpanlogo Crew", photo: null, statut: "valide", gere: false },
  { id: "x4", nom: "DJ Gbêtô", photo: null, statut: "valide", gere: false },
  { id: "x5", nom: "Nanawa", photo: null, statut: "valide", gere: false },
];

/** Artiste présélectionné (?artiste=, « Ajouter une date » de la page artiste) : un des siens, comme artistePourCreation. */
export function artisteDemo(id: string | undefined): ArtisteTrouve | null {
  const a = ARTISTES_ORGA.find((x) => x.id === id && x.statut !== "refuse");
  return a ? { id: a.id, nom: a.nom, photo: a.photo, statut: a.statut, gere: true } : null;
}

/** Mêmes règles que rechercherArtistes : les siens (sauf refusés) d'abord, puis les validés des autres. */
export async function chercherDemo(q: string): Promise<ArtisteTrouve[]> {
  await new Promise((r) => setTimeout(r, 300));
  const t = q.trim().toLowerCase();
  const siens: ArtisteTrouve[] = ARTISTES_ORGA.filter((a) => a.statut !== "refuse" && (!t || a.nom.toLowerCase().includes(t))).map((a) => ({
    id: a.id,
    nom: a.nom,
    photo: a.photo,
    statut: a.statut,
    gere: true,
  }));
  if (!t) return siens.slice(0, 8);
  return [...siens, ...AUTRES.filter((a) => a.nom.toLowerCase().includes(t))].slice(0, 8);
}
