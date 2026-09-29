"use client";

import { useState } from "react";
import Carte from "./Carte";
import Icon from "../Icon";
import type { EvenementCarte } from "./evenement";

type Styles = Record<string, string>;
export type ElementProgramme = { carte: EvenementCarte; href: string; groupe: { cle: string; libelle: string } };

/**
 * Programmation de l'accueil (V2), reprise de la preview (preview-design/
 * Programme.tsx). Filtre par catégorie instantané (les données sont déjà là,
 * pas de faux chargement), puces limitées aux catégories qui ont des
 * événements ; un événement à plusieurs catégories apparaît dans chacune.
 * Groupes par jour, un festival formant son propre groupe (comme /evenements).
 */
export default function Programme({ elements, s }: { elements: ElementProgramme[]; s: Styles }) {
  const [cat, setCat] = useState("Tout");
  const categories = ["Tout", ...Array.from(new Set(elements.flatMap((e) => e.carte.tags))).sort((a, b) => a.localeCompare(b, "fr"))];
  const liste = elements.filter((e) => cat === "Tout" || e.carte.tags.includes(cat));
  const compte = (c: string) => (c === "Tout" ? elements.length : elements.filter((e) => e.carte.tags.includes(c)).length);

  const groupes: { cle: string; libelle: string; elements: ElementProgramme[] }[] = [];
  for (const e of liste) {
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.cle === e.groupe.cle) dernier.elements.push(e);
    else groupes.push({ ...e.groupe, elements: [e] });
  }

  return (
    <div>
      {elements.length > 0 && (
        <div className={s.filtres} role="group" aria-label="Filtrer par catégorie">
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={c === cat} className={`${s.chip} ${c === cat ? s.chipOn : ""}`} onClick={() => setCat(c)}>
              {c}
              <span className={s.chipN}>{compte(c)}</span>
            </button>
          ))}
        </div>
      )}

      <p className={s.compteur} aria-live="polite">
        {`${liste.length} événement${liste.length > 1 ? "s" : ""}`}
      </p>

      {liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="calendar" size={32} className={s.videIco} />
          <h3 className={s.videTitre}>Aucun événement {cat !== "Tout" ? `« ${cat} » ` : ""}pour le moment</h3>
          <p className={s.videTexte}>
            {cat !== "Tout" ? "Les organisateurs publient chaque semaine. Essaie une autre catégorie ou reviens bientôt." : "Les organisateurs publient chaque semaine. Reviens très bientôt !"}
          </p>
          {cat !== "Tout" && (
            <button type="button" className={s.videBtn} onClick={() => setCat("Tout")}>
              Voir tous les événements
            </button>
          )}
        </div>
      ) : (
        groupes.map((g) => (
          <div key={g.cle} className={s.groupe}>
            <div className={s.groupeTete}>
              <span>{g.libelle}</span>
              <span className={s.groupeN}>{g.elements.length}</span>
            </div>
            <div className={s.grille}>
              {g.elements.map((e) => (
                <Carte key={e.carte.slug} e={e.carte} s={s} href={e.href} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
