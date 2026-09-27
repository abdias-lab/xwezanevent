"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { montant } from "../../orga/_orga";

export type VirementVue = {
  id: string;
  montant: number;
  moyen: string;
  numero: string;
  orgaAffiche: string;
  orgaPerso: string;
  orgaTel: string;
  evenement: string;
  dateEvenement: string;
  eligible: boolean;
  eligibleLe: string;
  demande: string;
};

/**
 * Virements prêts à envoyer (preview V2). Même action qu'en prod
 * (components/admin/ActionsPayout.tsx → /api/admin/payouts/[id]/traiter) :
 * l'admin envoie l'argent hors plateforme, puis marque la demande « traitée ».
 */
export default function Virements({ virements }: { virements: VirementVue[] }) {
  const [traites, setTraites] = useState<Record<string, string>>({});
  const [confirmer, setConfirmer] = useState<VirementVue | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  async function copier(v: VirementVue) {
    try {
      await navigator.clipboard.writeText(v.numero.replace(/\s/g, ""));
      setCopie(v.id);
      setTimeout(() => setCopie((c) => (c === v.id ? null : c)), 2000);
    } catch {
      setCopie(null);
    }
  }

  return (
    <>
      <ul className={s.pile} style={{ gap: 12 }}>
        {virements.map((v) => {
          const fait = traites[v.id];
          const autreNumero = v.numero.replace(/\s/g, "") !== v.orgaTel.replace(/\s/g, "");
          return (
            <li key={v.id} className={s.bloc}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.grosMontant}>{montant(v.montant)}</p>
                  <p className={s.carteMeta}>
                    {v.orgaAffiche}
                    {v.orgaAffiche !== v.orgaPerso ? ` (${v.orgaPerso})` : ""} · demandé {v.demande}
                  </p>
                </div>
                {!v.eligible && <span className={`${s.statut} ${s.stAttente}`}>Prématuré</span>}
                {fait && <span className={`${s.statut} ${s.stFort}`}>Traité</span>}
              </div>

              <div className={s.lien} style={{ background: "var(--hover)", padding: 12 }}>
                <div style={{ flex: 1 }}>
                  <span className={s.note} style={{ display: "block" }}>
                    Envoyer sur {v.moyen}
                  </span>
                  <b className={s.chiffre} style={{ fontSize: 20, lineHeight: "28px", letterSpacing: "0.02em" }}>
                    {v.numero}
                  </b>
                </div>
                <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => copier(v)} aria-label={`Copier le numéro ${v.numero}`}>
                  <Icon name={copie === v.id ? "check" : "copy"} /> {copie === v.id ? "Copié" : "Copier"}
                </button>
              </div>
              {autreNumero && (
                <p className={s.alerte} style={{ marginBottom: 0 }}>
                  <Icon name="info" />
                  <span>
                    Numéro différent du téléphone du compte ({v.orgaTel}). Vérifie avec l&apos;organisateur avant d&apos;envoyer si tu as un doute.
                  </span>
                </p>
              )}

              <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                <dt>Événement</dt>
                <dd>
                  {v.evenement} · {v.dateEvenement}
                </dd>
                <dt>Éligible</dt>
                <dd>{v.eligible ? `depuis le ${v.eligibleLe}` : `à partir du ${v.eligibleLe}`}</dd>
              </dl>

              {fait ? (
                <p className={s.note}>
                  <Icon name="check" size={16} /> Marqué traité à {fait}. L&apos;organisateur le voit dans ses reversements.
                </p>
              ) : v.eligible ? (
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setConfirmer(v)}>
                  <Icon name="check" /> Marquer comme versé
                </button>
              ) : (
                <p className={`${s.alerte} ${s.alerteDanger}`} style={{ marginBottom: 0 }}>
                  <Icon name="alert" />
                  <span>
                    L&apos;événement n&apos;a pas encore eu lieu : ce virement ne peut pas être traité avant le {v.eligibleLe} (règle des 3 jours). Demande
                    antérieure au contrôle, à laisser en attente.
                  </span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {confirmer && (
        <div className={s.fond} onClick={() => setConfirmer(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-verse" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-verse" className={s.feuilleTitre}>
              As-tu bien envoyé l&apos;argent ?
            </h2>
            <div className={s.recap}>
              <div>
                <span>Montant</span>
                <b className={s.montantOr}>{montant(confirmer.montant)}</b>
              </div>
              <div>
                <span>{confirmer.moyen}</span>
                <b className={s.chiffre}>{confirmer.numero}</b>
              </div>
              <div>
                <span>Organisateur</span>
                <b>{confirmer.orgaAffiche}</b>
              </div>
            </div>
            <p className={s.feuilleTexte}>Marque la demande traitée seulement après l&apos;envoi réel. C&apos;est définitif.</p>
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setConfirmer(null)}>
                Pas encore
              </button>
              <button
                type="button"
                className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
                autoFocus
                onClick={() => {
                  const h = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  setTraites((p) => ({ ...p, [confirmer.id]: h }));
                  setConfirmer(null);
                }}
              >
                Oui, c&apos;est versé
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
