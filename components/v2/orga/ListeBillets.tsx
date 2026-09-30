"use client";

import { useState, type CSSProperties } from "react";
import s from "../espace.module.css";
import Icon from "../Icon";
import { STATUTS_BILLET, StatutBilletV2, type StatutBillet } from "../statuts";

export type BilletOrga = { id: string; ref: string; nom: string; tarif: string; statut: StatutBillet; achat: string; scanne: string | null };

const COLS = { "--cols": "minmax(0, 1.8fr) 120px minmax(0, 1fr) 112px 96px" } as CSSProperties;

/**
 * Billets vendus d'un événement (V2), repris de la preview
 * (v2/orga/evenements/[id]/Interactifs.tsx) : recherche + filtre par statut,
 * côté navigateur. Sans le téléphone de l'acheteur (décision du 2026-09-28 :
 * l'organisateur n'y a pas accès, migration 20260717140000).
 */
export default function ListeBillets({ billets }: { billets: BilletOrga[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"tous" | StatutBillet>("tous");
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = billets.filter((b) => (f === "tous" || b.statut === f) && norm(`${b.nom} ${b.ref}`).includes(norm(q.trim())));
  const n = (k: StatutBillet) => billets.filter((b) => b.statut === k).length;

  if (billets.length === 0) {
    return (
      <div className={s.vide}>
        <Icon name="ticket" size={32} />
        <p className={s.videTitre}>Aucun billet vendu</p>
        <p className={s.videTexte}>Les billets apparaîtront ici dès la première vente. Partage le lien de ta page pour lancer les réservations.</p>
      </div>
    );
  }

  return (
    <>
      <div className={s.recherche}>
        <Icon name="search" size={20} />
        <input type="search" placeholder="Nom ou référence" aria-label="Rechercher un billet" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className={s.puces} role="group" aria-label="Filtrer par statut">
        {(["tous", "valide", "utilise", "annule"] as const).map((k) => (
          <button key={k} type="button" className={`${s.puce} ${f === k ? s.puceOn : ""}`} aria-pressed={f === k} onClick={() => setF(k)}>
            {k === "tous" ? "Tous" : STATUTS_BILLET[k]}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{k === "tous" ? billets.length : n(k)}</span>
          </button>
        ))}
      </div>
      <p className={s.compte}>
        {visibles.length} billet{visibles.length > 1 ? "s" : ""} affiché{visibles.length > 1 ? "s" : ""} sur {billets.length}
      </p>

      {visibles.length === 0 ? (
        <div className={s.vide}>
          <Icon name="search" size={32} />
          <p className={s.videTitre}>Aucun résultat</p>
          <p className={s.videTexte}>Aucun billet ne correspond à « {q} ». Vérifie l&apos;orthographe ou cherche par référence (XWZ-…).</p>
          <button
            type="button"
            className={`${s.btn} ${s.btnGris}`}
            onClick={() => {
              setQ("");
              setF("tous");
            }}
          >
            Effacer la recherche
          </button>
        </div>
      ) : (
        <ul className={s.liste}>
          <li className={s.enteteListe} style={COLS} aria-hidden="true">
            <span>Titulaire</span>
            <span>Référence</span>
            <span>Tarif</span>
            <span>Acheté le</span>
            <span>Statut</span>
          </li>
          {visibles.map((b) => (
            <li key={b.id} className={s.carte} style={{ ...COLS, gap: 8 }}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre} style={{ fontSize: 15 }}>
                    {b.nom}
                  </p>
                </div>
                <span className={s.masqueDesktop}>
                  <StatutBilletV2 statut={b.statut} />
                </span>
              </div>
              <dl className={s.paires}>
                <dt>Référence</dt>
                <dd className={s.chiffre}>{b.ref}</dd>
                <dt>Tarif</dt>
                <dd>{b.tarif}</dd>
                <dt>Acheté le</dt>
                <dd>{b.achat}</dd>
                {b.scanne && (
                  <>
                    <dt className={s.masqueDesktop}>Entré à</dt>
                    <dd className={s.masqueDesktop}>{b.scanne}</dd>
                  </>
                )}
              </dl>
              <span className={s.cellule}>
                <StatutBilletV2 statut={b.statut} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
