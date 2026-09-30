"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import v from "../../v2.module.css";
import Icon from "../../../Icon";
import Epingle from "../../../Epingle";
import type { Evenement } from "../../../_data";
import { montant, nombre, type Statut } from "../../orga/_orga";

type Action = "annuler" | "supprimer";

/** Longueur maximale de l'accroche (prod : route + contrainte en base). */
const ACCROCHE_MAX = 200;

/**
 * Actions de gestion d'un événement (preview V2). Mêmes règles qu'en prod
 * (components/admin/ActionsEvenementGestion.tsx, ToggleMiseEnAvant.tsx) :
 * - à la une : seulement « en vente » (revérifié à l'affichage côté public) ;
 * - annuler : tout statut sauf « annulé » ; billets invalidés, virements gelés ;
 * - supprimer : seulement si aucun billet n'a jamais été vendu.
 */
export default function Gestion({
  titre,
  statut,
  vendus,
  brut,
  aLaUneInitial,
  apercu,
  repli,
}: {
  titre: string;
  statut: Statut;
  vendus: number;
  brut: number;
  aLaUneInitial: boolean;
  /** Carte de l'aperçu « Épinglé ». */
  apercu: Evenement;
  /** Début de la description, affiché quand l'accroche est vide. */
  repli: string | null;
}) {
  const [aLaUne, setALaUne] = useState(aLaUneInitial);
  const [accroche, setAccroche] = useState<string | null>(null);
  const [edition, setEdition] = useState(false);
  const [etat, setEtat] = useState<Statut | "supprime">(statut);
  const [modale, setModale] = useState<Action | null>(null);

  if (etat === "supprime") return <span className={s.note}>Supprimé</span>;

  return (
    // Une feuille ouverte (position fixed) reste prise dans ce contexte d'empilement :
    // il passe alors au-dessus des lignes suivantes et de la barre de navigation mobile.
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, position: "relative", zIndex: modale || edition ? 60 : 1 }}>
      {etat === "publie" && (
        <button type="button" className={`${s.btn} ${aLaUne ? s.btnOr : s.btnGris}`} aria-pressed={aLaUne} onClick={() => setALaUne((v) => !v)}>
          <Icon name={aLaUne ? "check" : "plus"} size={16} /> {aLaUne ? "À la une" : "Mettre à la une"}
        </button>
      )}
      {etat === "publie" && (
        <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setEdition(true)}>
          <Icon name="edit" size={16} /> Accroche
        </button>
      )}
      {edition && (
        <FeuilleAccroche
          apercu={apercu}
          repli={repli}
          valeur={accroche}
          onFermer={() => setEdition(false)}
          onEnregistre={(x) => {
            setAccroche(x);
            setEdition(false);
          }}
        />
      )}
      {etat !== "annule" && (
        <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setModale("annuler")}>
          Annuler
        </button>
      )}
      {vendus === 0 ? (
        <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={() => setModale("supprimer")}>
          Supprimer
        </button>
      ) : (
        <span className={s.note} style={{ alignSelf: "center" }}>
          Suppression impossible : billets vendus
        </span>
      )}

      {modale && (
        <div className={s.fond} onClick={() => setModale(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-gestion" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-gestion" className={s.feuilleTitre}>
              {modale === "annuler" ? `Annuler « ${titre} » ?` : `Supprimer « ${titre} » ?`}
            </h2>
            {modale === "annuler" ? (
              <ul className={s.checklist} style={{ color: "#fff" }}>
                <li>
                  <Icon name="x" size={16} /> Retiré du catalogue et des ventes.
                </li>
                {vendus > 0 && (
                  <>
                    <li>
                      <Icon name="ticket" size={16} /> {nombre(vendus)} billets invalidés, refusés au scan.
                    </li>
                    <li>
                      <Icon name="wallet" size={16} /> Virements en attente gelés. {montant(brut)} de ventes à rembourser aux acheteurs.
                    </li>
                    <li>
                      <Icon name="alert" size={16} /> Les acheteurs ne sont pas prévenus automatiquement (bug #7).
                    </li>
                  </>
                )}
                <li>
                  <Icon name="shield" size={16} /> Aucune donnée supprimée.
                </li>
              </ul>
            ) : (
              <p className={s.feuilleTexte}>Suppression définitive de l&apos;événement et de sa billetterie. Aucun billet n&apos;a été vendu.</p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setModale(null)}>
                Retour
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`}
                onClick={() => {
                  setEtat(modale === "annuler" ? "annule" : "supprime");
                  setALaUne(false);
                  setModale(null);
                }}
              >
                {modale === "annuler" ? "Annuler l'événement" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
      {etat === "annule" && statut !== "annule" && <span className={`${s.statut} ${s.stBarre}`}>Annulé</span>}
    </div>
  );
}

/**
 * Saisie du texte d'accroche, avec l'aperçu de la carte telle qu'elle
 * apparaîtra dans « Épinglé » sur l'accueil. Vide : l'aperçu montre le repli
 * sur la description. En prod : POST /api/admin/events/[id]/accroche.
 */
function FeuilleAccroche({
  apercu,
  repli,
  valeur,
  onFermer,
  onEnregistre,
}: {
  apercu: Evenement;
  repli: string | null;
  valeur: string | null;
  onFermer: () => void;
  onEnregistre: (accroche: string | null) => void;
}) {
  const [texte, setTexte] = useState(valeur ?? "");
  const propre = texte.trim().replace(/\s+/g, " ");
  const id = `accroche-${apercu.slug}`;

  return (
    <div className={s.fond} onClick={onFermer}>
      <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-${id}`} onClick={(ev) => ev.stopPropagation()}>
        <h2 id={`titre-${id}`} className={s.feuilleTitre}>
          Texte d&apos;accroche
        </h2>
        <div className={s.champ}>
          <label htmlFor={id}>
            Accroche <small>(optionnel)</small>
          </label>
          <textarea
            id={id}
            value={texte}
            maxLength={ACCROCHE_MAX}
            onChange={(ev) => setTexte(ev.target.value)}
            placeholder={repli ?? "Une phrase qui donne envie de venir"}
            aria-describedby={`aide-${id}`}
            autoFocus
          />
          <p id={`aide-${id}`} className={s.aide} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span>Affichée sous l&apos;affiche dans « Épinglé ». Vide : début de la description.</span>
            <span style={{ flex: "none", fontVariantNumeric: "tabular-nums" }}>
              {texte.length}/{ACCROCHE_MAX}
            </span>
          </p>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <p className={s.etiquette}>Aperçu</p>
          <div style={{ maxWidth: 320 }}>
            <Epingle e={apercu} accroche={propre || repli} s={v} />
          </div>
        </div>
        <div className={s.feuilleActions}>
          <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={onFermer}>
            Retour
          </button>
          <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => onEnregistre(propre || null)}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
