/** BOM UTF-8 : nécessaire pour qu'Excel (FR) détecte l'encodage et affiche
 * correctement les accents au lieu de les corrompre. */
const BOM_UTF8 = "﻿";

function echapperChamp(valeur: string, delimiteur: string): string {
  if (valeur.includes(delimiteur) || valeur.includes('"') || valeur.includes("\n") || valeur.includes("\r")) {
    return `"${valeur.replace(/"/g, '""')}"`;
  }
  return valeur;
}

/** Construit un CSV (avec BOM UTF-8) à partir d'en-têtes et de lignes. */
export function construireCsv(
  entetes: string[],
  lignes: string[][],
  delimiteur = ";"
): string {
  const toutes = [entetes, ...lignes];
  const texte = toutes
    .map((ligne) => ligne.map((champ) => echapperChamp(champ, delimiteur)).join(delimiteur))
    .join("\r\n");
  return BOM_UTF8 + texte;
}
