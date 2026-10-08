/**
 * Fin de vente d'un tarif (ticket_types.vente_jusqua, design/BUGS_REFONTE.md
 * n°10, décisions d'Abdias du 2026-10-08).
 *
 * L'organisateur choisit un JOUR (« vente jusqu'au 1er oct. ») : la vente
 * s'arrête à la fin de ce jour, 23:59:59 heure de Porto-Novo. Pas de règle
 * des 6 h ici (elle sert au scan d'une soirée qui déborde après minuit) : une
 * fin de vente est souvent une prévente, qui ne doit pas se vendre après la
 * date promise. Le Bénin est en UTC+1 toute l'année (pas d'heure d'été) :
 * décalage écrit en dur, jamais déduit du fuseau du serveur (Vercel est en
 * UTC, ce qui décalait la fin de vente d'une heure).
 *
 * Pas de "server-only" : la même règle sert à l'affichage (tarif grisé) et
 * aux trois contrôles serveur qui créent un paiement (/api/orders,
 * « Réessayer », « Recommencer »). Un paiement ouvert avant la fin et réglé
 * après est honoré (finaliserCommande ne contrôle pas la fin de vente).
 */

const DECALAGE_PORTO_NOVO = "+01:00";

/** « 2026-10-01 » → « 2026-10-01T23:59:59+01:00 », fin du jour à Porto-Novo. */
export function finDeVenteDepuisDate(date: string): string {
  return `${date}T23:59:59${DECALAGE_PORTO_NOVO}`;
}

/** La vente du tarif est-elle terminée ? Sans date de fin : jamais. */
export function venteTerminee(venteJusqua: string | null | undefined, maintenant: Date = new Date()): boolean {
  if (!venteJusqua) return false;
  const fin = new Date(venteJusqua);
  return !Number.isNaN(fin.getTime()) && fin <= maintenant;
}

/** Message de refus commun aux trois contrôles serveur. */
export const messageVenteTerminee = (nomTarif: string) => `La vente du tarif « ${nomTarif} » est terminée.`;
