// Données d'affichage d'un événement public V2 et leurs formats, repris de la
// preview (app/(preview)/preview-design/_data.ts) : même type, mêmes règles.

export type EvenementCarte = {
  slug: string;
  titre: string;
  categorie: string;
  lieu: string;
  ville: string;
  debut: string; // AAAA-MM-JJ
  fin?: string; // festival multi-jours
  heure: string;
  prixMin: number; // FCFA, 0 = gratuit
  prixLibelle?: string; // remplace le prix calculé (ex. aperçu sans tarif saisi)
  organisateur: string;
  tags: string[];
  image: string | null; // null = pas d'affiche
  restantes?: number;
};

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parse(d: string) {
  const [y, m, j] = d.split("-").map(Number);
  return { y, m: m - 1, j, dow: new Date(Date.UTC(y, m - 1, j)).getUTCDay() };
}

export function jour(d: string) {
  return String(parse(d).j).padStart(2, "0");
}
export function mois(d: string) {
  return MOIS[parse(d).m];
}
export function jourSemaine(d: string) {
  return JOURS[parse(d).dow];
}
/** « sam. 24 oct. » ; festival : « 13–15 nov. ». */
export function dateCarte(e: Pick<EvenementCarte, "debut" | "fin">) {
  const a = parse(e.debut);
  if (e.fin) {
    const b = parse(e.fin);
    return a.m === b.m && a.y === b.y ? `${a.j}–${b.j} ${MOIS[b.m]}` : `${a.j} ${MOIS[a.m]} – ${b.j} ${MOIS[b.m]}`;
  }
  return `${JOURS[a.dow]} ${a.j} ${MOIS[a.m]}`;
}
/** Date longue (preview-design/_data.ts) : « samedi 3 oct. 2026 », « Du 13 au 15 nov. 2026 ». */
export function dateLongue(e: Pick<EvenementCarte, "debut" | "fin">) {
  const a = parse(e.debut);
  if (e.fin) {
    const b = parse(e.fin);
    if (a.y !== b.y) return `Du ${a.j} ${MOIS[a.m]} ${a.y} au ${b.j} ${MOIS[b.m]} ${b.y}`;
    return a.m === b.m ? `Du ${a.j} au ${b.j} ${MOIS[b.m]} ${b.y}` : `Du ${a.j} ${MOIS[a.m]} au ${b.j} ${MOIS[b.m]} ${b.y}`;
  }
  return `${JOURS[a.dow]} ${a.j} ${MOIS[a.m]} ${a.y}`;
}
export function fcfa(n: number) {
  if (n === 0) return "Gratuit";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0") + "\u00A0FCFA";
}
export function prixDes(e: EvenementCarte) {
  if (e.prixLibelle) return e.prixLibelle;
  return e.prixMin === 0 ? "Gratuit" : `Dès ${fcfa(e.prixMin)}`;
}
export function initiales(titre: string) {
  return titre
    .split(/\s+/)
    .map((m) => m.replace(/^[^0-9A-Za-zÀ-ÖØ-öø-ÿ]+/, "")) // « [TEST] », « (Re)découverte » : jamais de ponctuation en initiale
    .filter((m) => m.length > 2)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}
