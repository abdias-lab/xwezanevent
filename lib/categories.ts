/**
 * Liste fermée des catégories, partagée entre la création et l'édition
 * d'événement. Le libellé (avec emoji) est affiché côté UI ; la valeur
 * stockée en base (dans `event_categories.categorie`) est le libellé sans
 * l'emoji — voir valeurCategorie().
 */
export const CATEGORIES = [
  "🎵 Concert",
  "🎪 Festival",
  "🪘 Culture & Vodun",
  "⚽ Sport",
  "😂 Humour",
  "🌙 Soirée",
];

export const MAX_CATEGORIES = 3;

export function valeurCategorie(label: string): string {
  return label.replace(/^\S+\s/, "");
}
