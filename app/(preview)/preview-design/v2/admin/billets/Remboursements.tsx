"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { montant } from "../../orga/_orga";

export type CommandeARembourser = {
  commande: string;
  nom: string;
  tel: string;
  email: string;
  invite: boolean;
  evenement: string;
  billets: number;
  total: number;
};

/**
 * NOUVELLE FONCTIONNALITÉ (design/BUGS_REFONTE.md, bug #7) : suivi des
 * remboursements après annulation. En prod, rien ne permet aujourd'hui de
 * passer une commande en `rembourse`. Il faudra une route service_role.
 */
export default function Remboursements({ commandes }: { commandes: CommandeARembourser[] }) {
  const [faits, setFaits] = useState<Record<string, string>>({});
  const [confirmer, setConfirmer] = useState<CommandeARembourser | null>(null);
  const restant = commandes.filter((c) => !faits[c.commande]).reduce((n, c) => n + c.total, 0);

  return (
    <>
      <p className={s.alerte}>
        <Icon name="info" />
        <span>
          Rembourse chaque acheteur sur son numéro Mobile Money (prix payé en entier, sans frais), puis marque la commande remboursée. Reste à rembourser :{" "}
          <b>{montant(restant)}</b>.
        </span>
      </p>
      <ul className={s.pile} style={{ gap: 8 }}>
        {commandes.map((c) => {
          const fait = faits[c.commande];
          return (
            <li key={c.commande} className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>
                    {montant(c.total)} · {c.nom}
                    {c.invite && (
                      <span className={`${s.statut} ${s.stNeutre}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                        Invité
                      </span>
                    )}
                  </p>
                  <p className={s.carteMeta}>
                    <b className={s.chiffre} style={{ color: "#fff" }}>
                      {c.tel}
                    </b>{" "}
                    · {c.email}
                  </p>
                  <p className={s.carteMeta}>
                    {c.evenement} · {c.billets} billet{c.billets > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {fait ? (
                <span className={`${s.statut} ${s.stFort}`}>Remboursé à {fait}</span>
              ) : (
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setConfirmer(c)}>
                  <Icon name="check" /> Marquer remboursé
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {confirmer && (
        <div className={s.fond} onClick={() => setConfirmer(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-remb" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-remb" className={s.feuilleTitre}>
              As-tu bien remboursé {confirmer.nom} ?
            </h2>
            <div className={s.recap}>
              <div>
                <span>Montant</span>
                <b className={s.montantOr}>{montant(confirmer.total)}</b>
              </div>
              <div>
                <span>Numéro</span>
                <b className={s.chiffre}>{confirmer.tel}</b>
              </div>
            </div>
            <p className={s.feuilleTexte}>La commande passera en « remboursée »{confirmer.invite ? "" : " : l'acheteur le verra dans son compte"}. C&apos;est définitif.</p>
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setConfirmer(null)}>
                Pas encore
              </button>
              <button
                type="button"
                autoFocus
                className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
                onClick={() => {
                  const h = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  setFaits((p) => ({ ...p, [confirmer.commande]: h }));
                  setConfirmer(null);
                }}
              >
                Oui, c&apos;est remboursé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
