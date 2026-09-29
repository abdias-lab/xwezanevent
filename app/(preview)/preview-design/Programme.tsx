"use client";

import { useEffect, useRef, useState } from "react";
import Carte, { CarteSquelette } from "./Carte";
import Icon from "./Icon";
import { jour, jourSemaine, mois, type EtatForce, type Evenement } from "./_data";

type Styles = Record<string, string>;

/**
 * Filtre par catégorie + trois états : liste, chargement (squelettes), vide.
 * Le chargement est simulé (400 ms) à chaque changement de filtre pour pouvoir
 * juger les squelettes ; `etatInitial` permet de forcer un état via l'URL.
 */
export default function Programme({
  evenements,
  categories: categoriesImposees,
  s,
  href,
  etatInitial = "liste",
}: {
  evenements: Evenement[];
  /** Liste imposée (pistes v1/v3). Absente (v2) : seulement les catégories qui ont des événements. */
  categories?: string[];
  s: Styles;
  href: string;
  etatInitial?: EtatForce;
}) {
  const [cat, setCat] = useState(etatInitial === "vide" ? "Sport" : "Tout");
  const [charge, setCharge] = useState(etatInitial === "chargement");
  const minuteur = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuteur.current), []);

  function choisir(c: string) {
    if (c === cat) return;
    setCat(c);
    setCharge(true);
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => setCharge(false), 400);
  }

  const categories = categoriesImposees ?? ["Tout", ...Array.from(new Set(evenements.map((e) => e.categorie))).sort((a, b) => a.localeCompare(b, "fr"))];
  const liste = evenements.filter((e) => cat === "Tout" || e.categorie === cat).sort((a, b) => a.debut.localeCompare(b.debut));
  const compte = (c: string) => (c === "Tout" ? evenements.length : evenements.filter((e) => e.categorie === c).length);

  // Un groupe par jour ayant au moins un événement : les jours vides n'apparaissent pas.
  const groupes = Array.from(
    liste.reduce((m, e) => m.set(e.debut, [...(m.get(e.debut) ?? []), e]), new Map<string, Evenement[]>()).entries(),
  );

  return (
    <div>
      <div className={s.filtres} role="group" aria-label="Filtrer par catégorie">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={c === cat} className={`${s.chip} ${c === cat ? s.chipOn : ""}`} onClick={() => choisir(c)}>
            {c}
            <span className={s.chipN}>{compte(c)}</span>
          </button>
        ))}
      </div>

      <p className={s.compteur} aria-live="polite">
        {charge ? "Chargement…" : `${liste.length} événement${liste.length > 1 ? "s" : ""}`}
      </p>

      {charge ? (
        <div className={s.grille} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <CarteSquelette key={i} s={s} />
          ))}
        </div>
      ) : liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="calendar" size={32} className={s.videIco} />
          <h3 className={s.videTitre}>Aucun événement {cat !== "Tout" ? `« ${cat} » ` : ""}pour le moment</h3>
          <p className={s.videTexte}>Les organisateurs publient chaque semaine. Essaie une autre catégorie ou reviens bientôt.</p>
          <button type="button" className={s.videBtn} onClick={() => choisir("Tout")}>
            Voir tous les événements
          </button>
        </div>
      ) : (
        groupes.map(([date, evs]) => (
          <div key={date} className={s.groupe}>
            <div className={s.groupeTete}>
              <span>
                {jourSemaine(date).replace(".", "")} {Number(jour(date))} {mois(date)}
              </span>
              <span className={s.groupeN}>{evs.length}</span>
            </div>
            <div className={s.grille}>
              {evs.map((e) => (
                <Carte key={e.slug} e={e} s={s} href={href} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
