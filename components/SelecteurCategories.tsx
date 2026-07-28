"use client";

import { CATEGORIES, MAX_CATEGORIES, valeurCategorie } from "@/lib/categories";

/**
 * Sélection multiple de catégories (jusqu'à MAX_CATEGORIES), contrôlée par
 * le parent. Rend son propre hidden input "categories" (JSON, dans l'ordre
 * de sélection) pour être posé tel quel dans un <form> — create et édition
 * partagent ce composant.
 */
export default function SelecteurCategories({
  valeurs,
  onChange,
}: {
  valeurs: string[];
  onChange: (v: string[]) => void;
}) {
  function basculer(val: string) {
    if (valeurs.includes(val)) {
      onChange(valeurs.filter((v) => v !== val));
      return;
    }
    if (valeurs.length >= MAX_CATEGORIES) return;
    onChange([...valeurs, val]);
  }

  return (
    <div className="champ-bloc">
      <input type="hidden" name="categories" value={JSON.stringify(valeurs)} />
      <label>
        Catégories * <small>(jusqu&apos;à {MAX_CATEGORIES})</small>
      </label>
      <div className="puces-cat">
        {CATEGORIES.map((c) => {
          const val = valeurCategorie(c);
          const actif = valeurs.includes(val);
          const desactive = !actif && valeurs.length >= MAX_CATEGORIES;
          return (
            <button
              key={c}
              type="button"
              className="puce-cat"
              aria-pressed={actif}
              disabled={desactive}
              onClick={() => basculer(val)}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
