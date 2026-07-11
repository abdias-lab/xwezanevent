const DECALAGE_PORTO_NOVO_MS = 60 * 60 * 1000; // UTC+1, fixe (pas d'heure d'été au Bénin)

/**
 * Date du jour (YYYY-MM-DD) dans le fuseau Africa/Porto-Novo — utilisée
 * pour décider si un événement (date_debut, une DATE sans heure) est passé.
 * Ne PAS utiliser `new Date().toISOString().slice(0, 10)` seul : ça donne
 * la date en UTC, décalée d'une heure par rapport à Porto-Novo autour de
 * minuit.
 */
export function aujourdhuiPortoNovo(): string {
  return new Date(Date.now() + DECALAGE_PORTO_NOVO_MS).toISOString().slice(0, 10);
}
