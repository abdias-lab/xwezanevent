// Formats d'affichage V2, partagés par les espaces migrés (repris des
// maquettes : app/(preview)/preview-design/v2/orga/_orga.ts).

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** 12500 → "12 500" (espace fine insécable évitée : rendu identique partout). */
export function nombre(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function montant(n: number) {
  return `${nombre(n)}\u00A0FCFA`;
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

/** Date (AAAA-MM-JJ) et heure (HH:MM) d'un instant ISO, à l'heure du Bénin (Africa/Porto-Novo). */
function partiesBenin(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Porto-Novo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value])
  );
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.hour}:${p.minute}` };
}

/** Instant ISO → "28 sept. 2026 · 09:42", à l'heure du Bénin. */
export function dateHeure(iso: string) {
  const { jour, heure } = partiesBenin(iso);
  return `${dateAnnee(jour)} · ${heure}`;
}

/** Instant ISO → "28 sept. · 09:42" (sans l'année), à l'heure du Bénin. */
export function dateHeureCourte(iso: string) {
  const { jour, heure } = partiesBenin(iso);
  return `${dateCourte(jour)} · ${heure}`;
}

/** Instant ISO → "09:42", à l'heure du Bénin. */
export function heureBenin(iso: string) {
  return partiesBenin(iso).heure;
}

/**
 * Part en pourcentage arrondi : "66 %". Une part non nulle qui s'arrondirait
 * à 0 s'affiche "moins de 1 %" (6 billets sur 2 252 places ne font pas 0 %).
 */
export function pourcent(part: number, total: number) {
  const p = total > 0 ? Math.round((part / total) * 100) : 0;
  return part > 0 && p === 0 ? "moins de 1\u00A0%" : `${p}\u00A0%`;
}
