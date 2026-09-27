"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { montant, nombre, type Statut } from "../../orga/_orga";

type Action = "annuler" | "supprimer";

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
}: {
  titre: string;
  statut: Statut;
  vendus: number;
  brut: number;
  aLaUneInitial: boolean;
}) {
  const [aLaUne, setALaUne] = useState(aLaUneInitial);
  const [etat, setEtat] = useState<Statut | "supprime">(statut);
  const [modale, setModale] = useState<Action | null>(null);

  if (etat === "supprime") return <span className={s.note}>Supprimé</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, position: "relative", zIndex: 1 }}>
      {etat === "publie" && (
        <button type="button" className={`${s.btn} ${aLaUne ? s.btnOr : s.btnGris}`} aria-pressed={aLaUne} onClick={() => setALaUne((v) => !v)}>
          <Icon name={aLaUne ? "check" : "plus"} size={16} /> {aLaUne ? "À la une" : "Mettre à la une"}
        </button>
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
