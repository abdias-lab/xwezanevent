"use client";

import { useState, type CSSProperties } from "react";
import s from "../../../espace.module.css";
import Icon from "../../../../Icon";
import { StatutBillet } from "../../ui";
import { STATUTS_BILLET, type Billet, type StatutBillet as TStatut } from "../../_orga";

const COLS = { "--cols": "minmax(0, 1.8fr) 96px minmax(0, 1fr) 112px 96px" } as CSSProperties;

/** Liste des billets vendus : recherche + filtre par statut, état local. */
export function ListeBillets({ billets, total }: { billets: Billet[]; total: number }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"tous" | TStatut>("tous");
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visibles = billets.filter((b) => (f === "tous" || b.statut === f) && norm(`${b.nom} ${b.ref} ${b.tel}`).includes(norm(q.trim())));
  const n = (k: TStatut) => billets.filter((b) => b.statut === k).length;

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
        <input type="search" placeholder="Nom, téléphone ou référence" aria-label="Rechercher un billet" value={q} onChange={(e) => setQ(e.target.value)} />
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
        {visibles.length} billet{visibles.length > 1 ? "s" : ""} affiché{visibles.length > 1 ? "s" : ""} · échantillon de {billets.length} sur {total} vendus
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
            <li key={b.ref} className={s.carte} style={{ ...COLS, gap: 8 }}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre} style={{ fontSize: 15 }}>
                    {b.nom}
                  </p>
                  <p className={s.carteMeta}>{b.tel}</p>
                </div>
                <span className={s.masqueDesktop}>
                  <StatutBillet statut={b.statut} />
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
                <StatutBillet statut={b.statut} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Lien de scan délégué (components/orga/LienScan.tsx) : générer, copier, révoquer. */
export function LienScan({ initial }: { initial: string | null }) {
  const [lien, setLien] = useState(initial);
  const [copie, setCopie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);

  return (
    <section className={s.panneau}>
      <h2 className={s.panneauTitre}>Lien de scan délégué</h2>
      <p className={s.aide} style={{ marginBottom: 12 }}>
        Pour tes contrôleurs à l&apos;entrée : ils scannent les billets de cet événement sans compte, sans accès à tes ventes.
      </p>
      {lien ? (
        <div className={s.pile}>
          <div className={s.lien}>
            <Icon name="link" />
            <code>{lien}</code>
            <button
              type="button"
              className={s.iconeBtn}
              aria-label="Copier le lien"
              onClick={() => {
                setCopie(true);
                setTimeout(() => setCopie(false), 2000);
              }}
            >
              <Icon name={copie ? "check" : "copy"} />
            </button>
          </div>
          <p className={s.note} aria-live="polite">
            {copie ? "Lien copié." : "Toute personne qui a ce lien peut valider des billets."}
          </p>
          {confirmer ? (
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setConfirmer(false)}>
                Garder
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger}`}
                onClick={() => {
                  setLien(null);
                  setConfirmer(false);
                }}
              >
                Révoquer le lien
              </button>
            </div>
          ) : (
            <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setConfirmer(true)}>
              Révoquer
            </button>
          )}
        </div>
      ) : (
        <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnPlein}`} onClick={() => setLien("https://xwezan.com/scan/lien/Qm7tR2sWx9")}>
          <Icon name="link" /> Générer un lien de scan
        </button>
      )}
    </section>
  );
}

/** Annulation avec saisie du nom exact (components/orga/ActionsEvenementOrga.tsx). */
export function Annuler({ titre }: { titre: string }) {
  const [ouverte, setOuverte] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [fait, setFait] = useState(false);
  const ok = saisie.trim() === titre;

  return (
    <section className={s.panneau}>
      <h2 className={s.panneauTitre}>Zone sensible</h2>
      {fait ? (
        <p className={`${s.alerte} ${s.alerteDanger}`} style={{ marginBottom: 0 }}>
          <Icon name="x" /> Événement annulé (simulation preview).
        </p>
      ) : (
        <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnPlein}`} onClick={() => setOuverte(true)}>
          Annuler l&apos;événement
        </button>
      )}
      {ouverte && (
        <div className={s.fond} onClick={() => setOuverte(false)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-annuler" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-annuler" className={s.feuilleTitre}>
              Annuler « {titre} » ?
            </h2>
            <ul className={s.checklist}>
              <li>
                <Icon name="x" /> Retiré des ventes et du catalogue public
              </li>
              <li>
                <Icon name="x" /> Billets non utilisés invalidés et refusés au scan
              </li>
              <li>
                <Icon name="x" /> Demandes de virement en attente gelées jusqu&apos;à vérification
              </li>
              <li className={s.fait}>
                <Icon name="check" /> Aucune donnée n&apos;est supprimée
              </li>
            </ul>
            <div className={s.champ}>
              <label htmlFor="confirm-annul">
                Pour confirmer, retape le nom exact : <b>{titre}</b>
              </label>
              <input id="confirm-annul" type="text" autoComplete="off" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
            </div>
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setOuverte(false)}>
                Retour
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`}
                disabled={!ok}
                onClick={() => {
                  setFait(true);
                  setOuverte(false);
                }}
              >
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
