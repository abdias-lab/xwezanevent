// Formats d'affichage V2, partagés par les espaces migrés (repris des
// maquettes : app/(preview)/preview-design/v2/orga/_orga.ts).

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** 12500 → "12 500" (espace fine insécable évitée : rendu identique partout). */
export function nombre(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function montant(n: number) {
  return `${nombre(n)} FCFA`;
}

/** "2026-11-13" (+ fin "2026-11-15") → "13–15 nov." ; sans fin → "13 nov.". */
export function dateCourte(d: string, fin?: string | null) {
  const [, m, j] = d.split("-").map(Number);
  if (fin && fin !== d) {
    const [, m2, j2] = fin.split("-").map(Number);
    return m === m2 ? `${j}–${j2} ${MOIS[m2 - 1]}` : `${j} ${MOIS[m - 1]} – ${j2} ${MOIS[m2 - 1]}`;
  }
  return `${j} ${MOIS[m - 1]}`;
}

/** "2026-09-28" → "28 sept. 2026". */
export function dateAnnee(d: string) {
  const [a, m, j] = d.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
}

/** Jours entiers écoulés depuis un instant ISO. */
export function joursDepuis(iso: string, maintenant = Date.now()) {
  return Math.floor((maintenant - Date.parse(iso)) / 86400000);
}

export function depuis(iso: string) {
  const n = joursDepuis(iso);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} jours`;
}
