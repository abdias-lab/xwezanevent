"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { dateCourteOrga, montant, nombre } from "../../orga/_orga";

export type Controle = { texte: string; motif: string };

export type EvenementAValider = {
  id: string;
  titre: string;
  orgaAffiche: string;
  orgaPerso: string;
  orgaEmail: string;
  debut: string;
  fin?: string;
  heure: string;
  lieu: string;
  ville: string;
  soumis: string;
  categories: string[];
  description: string;
  tarifs: { nom: string; prix: number; total: number }[];
  image: string | null;
  controles: Controle[];
};

type Decision = { type: "valide" } | { type: "refuse"; motif: string };

/**
 * File de validation (preview V2). Mêmes actions qu'en prod
 * (components/admin/ActionsEvenement.tsx) : valider, ou refuser avec un
 * motif envoyé par e-mail. État local uniquement, aucun appel réseau.
 */
export default function Validation({ evenements }: { evenements: EvenementAValider[] }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [refus, setRefus] = useState<EvenementAValider | null>(null);
  const restants = evenements.filter((e) => !decisions[e.id]).length;

  return (
    <>
      <p className={s.note} aria-live="polite" style={{ marginBottom: 12 }}>
        {restants === 0 ? "File vide : tous les événements ont été traités." : `${restants} à traiter, du plus ancien au plus récent.`}
      </p>
      <ul className={s.pile} style={{ gap: 16 }}>
        {evenements.map((e) => {
          const d = decisions[e.id];
          const places = e.tarifs.reduce((n, t) => n + t.total, 0);
          return (
            <li key={e.id} id={e.id} className={s.bloc} style={{ scrollMarginTop: 80 }}>
              <div className={s.carteHaut}>
                <div>
                  <h2 className={s.carteTitre} style={{ fontSize: 18, lineHeight: "24px" }}>
                    {e.titre}
                  </h2>
                  <p className={s.carteMeta}>
                    {e.orgaAffiche}
                    {e.orgaAffiche !== e.orgaPerso ? ` (${e.orgaPerso})` : ""} · soumis {e.soumis}
                  </p>
                </div>
              </div>

              {d ? (
                <p className={`${s.alerte} ${d.type === "refuse" ? s.alerteDanger : ""}`} role="status" style={{ marginBottom: 0 }}>
                  <Icon name={d.type === "valide" ? "check" : "x"} />
                  <span>
                    {d.type === "valide" ? (
                      <>
                        <b>Validé, en vente.</b> {e.orgaAffiche} reçoit l&apos;e-mail « {e.titre} est en ligne ».
                      </>
                    ) : (
                      <>
                        <b>Refusé.</b> {d.motif ? `Motif envoyé : « ${d.motif} »` : "E-mail envoyé sans motif."}
                      </>
                    )}
                  </span>
                </p>
              ) : (
                <>
                  <div className={s.colonnesValidation}>
                    <div className={s.afficheValidation}>
                      {e.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.image} alt={`Affiche : ${e.titre}`} />
                      ) : (
                        <span className={s.note} style={{ display: "grid", placeItems: "center", height: "100%" }}>
                          Pas d&apos;affiche
                        </span>
                      )}
                    </div>
                    <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                      <dt>Quand</dt>
                      <dd>
                        {dateCourteOrga(e.debut, e.fin)} · {e.heure}
                      </dd>
                      <dt>Où</dt>
                      <dd>
                        {e.lieu}, {e.ville}
                      </dd>
                      <dt>Catégories</dt>
                      <dd>{e.categories.join(", ")}</dd>
                      <dt>Tarifs</dt>
                      <dd>
                        {e.tarifs.map((t) => (
                          <span key={t.nom} style={{ display: "block" }}>
                            {t.nom} : {t.prix === 0 ? "gratuit" : montant(t.prix)} · {nombre(t.total)} places
                          </span>
                        ))}
                        <span className={s.note}>{nombre(places)} places au total</span>
                      </dd>
                      <dt>Contact</dt>
                      <dd>{e.orgaEmail}</dd>
                    </dl>
                  </div>

                  <div>
                    <p className={s.etiquette}>Description</p>
                    <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--muted)" }}>{e.description}</p>
                  </div>

                  {e.controles.length > 0 ? (
                    <div className={s.panneau} style={{ background: "var(--hover)" }}>
                      <p className={s.panneauTitre}>Points à vérifier</p>
                      <ul className={s.checklist}>
                        {e.controles.map((c) => (
                          <li key={c.texte} style={{ color: "#fff", alignItems: "flex-start" }}>
                            <Icon name="alert" size={16} className={s.montantOr} />
                            <span>{c.texte}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className={s.note}>
                      <Icon name="check" size={16} /> Aucun point particulier relevé automatiquement.
                    </p>
                  )}

                  <div className={s.actionsValidation}>
                    <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setRefus(e)}>
                      <Icon name="x" /> Refuser
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
                      onClick={() => setDecisions((p) => ({ ...p, [e.id]: { type: "valide" } }))}
                    >
                      <Icon name="check" /> Valider et publier
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {refus && (
        <FeuilleRefus
          e={refus}
          onFermer={() => setRefus(null)}
          onRefuser={(motif) => {
            setDecisions((p) => ({ ...p, [refus.id]: { type: "refuse", motif } }));
            setRefus(null);
          }}
        />
      )}
    </>
  );
}

function FeuilleRefus({ e, onFermer, onRefuser }: { e: EvenementAValider; onFermer: () => void; onRefuser: (motif: string) => void }) {
  const [motif, setMotif] = useState("");
  const ajouter = (m: string) => setMotif((prev) => (prev.includes(m) ? prev : prev.trim() ? `${prev.trim()} ${m}` : m));
  return (
    <div className={s.fond} onClick={onFermer}>
      <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-refus" onClick={(ev) => ev.stopPropagation()}>
        <div>
          <h2 id="titre-refus" className={s.feuilleTitre}>
            Refuser « {e.titre} » ?
          </h2>
          <p className={s.feuilleTexte}>{e.orgaAffiche} reçoit un e-mail avec ce motif, pour corriger son événement.</p>
        </div>
        {e.controles.length > 0 && (
          <div className={s.champ}>
            <span className={s.etiquette}>Motifs suggérés</span>
            <div className={s.puces}>
              {e.controles.map((c) => (
                <button key={c.motif} type="button" className={s.puce} style={{ height: "auto", minHeight: 40, padding: "8px 16px", textAlign: "left" }} onClick={() => ajouter(c.motif)}>
                  <Icon name="plus" size={16} /> {c.motif}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={s.champ}>
          <label htmlFor="motif">
            Motif <small>(recommandé)</small>
          </label>
          <textarea id="motif" rows={4} value={motif} autoFocus placeholder="Ex : affiche manquante, description incomplète…" onChange={(ev) => setMotif(ev.target.value)} />
          {!motif.trim() && <span className={s.aide}>Sans motif, l&apos;organisateur ne saura pas quoi corriger.</span>}
        </div>
        <div className={s.feuilleActions}>
          <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={onFermer}>
            Annuler
          </button>
          <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`} onClick={() => onRefuser(motif.trim())}>
            Refuser l&apos;événement
          </button>
        </div>
      </div>
    </div>
  );
}
