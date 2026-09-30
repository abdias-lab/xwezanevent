"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { dateCourte, montant, nombre } from "../format";

export type Controle = { texte: string; motif: string };

export type EvenementAValider = {
  id: string;
  titre: string;
  orgaAffiche: string;
  orgaPerso: string;
  orgaEmail: string;
  debut: string;
  fin: string | null;
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

/** POST sur une route admin ; renvoie le message d'erreur, ou null si c'est fait. */
async function appeler(url: string, corps?: object): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: corps ? { "Content-Type": "application/json" } : undefined,
      body: corps ? JSON.stringify(corps) : undefined,
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? "Erreur";
  } catch {
    return "Erreur réseau";
  }
}

/**
 * File de validation (V2), reprise de la preview
 * (app/(preview)/preview-design/v2/admin/evenements/Validation.tsx) et
 * branchée sur /api/admin/events/[id]/valider et /refuser (qui envoient
 * l'e-mail à l'organisateur). Comme pour les virements : la carte traitée
 * reste affichée avec sa décision, la page serveur est rafraîchie aussitôt
 * pour que les compteurs soient justes.
 */
export default function Validation({ evenements }: { evenements: EvenementAValider[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, { d: Decision; vue: EvenementAValider; index: number }>>({});
  const [refus, setRefus] = useState<EvenementAValider | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const affiches = useMemo(() => {
    const liste = [...evenements];
    for (const t of Object.values(decisions).sort((a, b) => a.index - b.index)) {
      if (!liste.some((e) => e.id === t.vue.id)) liste.splice(Math.min(t.index, liste.length), 0, t.vue);
    }
    return liste;
  }, [evenements, decisions]);
  const restants = affiches.filter((e) => !decisions[e.id]).length;

  function decider(e: EvenementAValider, d: Decision) {
    const index = affiches.findIndex((x) => x.id === e.id);
    setDecisions((p) => ({ ...p, [e.id]: { d, vue: e, index } }));
    router.refresh();
  }

  async function valider(e: EvenementAValider) {
    setEnCours(e.id);
    setErreurs((p) => ({ ...p, [e.id]: "" }));
    const err = await appeler(`/api/admin/events/${e.id}/valider`);
    setEnCours(null);
    if (err) return setErreurs((p) => ({ ...p, [e.id]: err }));
    decider(e, { type: "valide" });
  }

  async function refuser(e: EvenementAValider, motif: string): Promise<string | null> {
    const err = await appeler(`/api/admin/events/${e.id}/refuser`, { motif: motif || undefined });
    if (err) return err;
    decider(e, { type: "refuse", motif });
    setRefus(null);
    return null;
  }

  return (
    <>
      <p className={s.note} aria-live="polite" style={{ marginBottom: 12 }}>
        {restants === 0 ? "File vide : tous les événements ont été traités." : `${restants} à traiter, du plus ancien au plus récent.`}
      </p>
      <ul className={s.pile} style={{ gap: 16 }}>
        {affiches.map((e) => {
          const d = decisions[e.id]?.d;
          const places = e.tarifs.reduce((n, t) => n + t.total, 0);
          const erreur = erreurs[e.id];
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
                        {dateCourte(e.debut, e.fin)} · {e.heure}
                      </dd>
                      <dt>Où</dt>
                      <dd>
                        {e.lieu}, {e.ville}
                      </dd>
                      <dt>Catégories</dt>
                      <dd>{e.categories.join(", ") || "—"}</dd>
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

                  {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
                  {erreur && (
                    <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                      <Icon name="alert" />
                      <span>{erreur}</span>
                    </p>
                  )}

                  <div className={s.actionsValidation}>
                    <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours !== null} onClick={() => setRefus(e)}>
                      <Icon name="x" /> Refuser
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={enCours !== null} onClick={() => valider(e)}>
                      <Icon name="check" /> {enCours === e.id ? "Publication…" : "Valider et publier"}
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {refus && <FeuilleRefus e={refus} onFermer={() => setRefus(null)} onRefuser={(motif) => refuser(refus, motif)} />}
    </>
  );
}

function FeuilleRefus({ e, onFermer, onRefuser }: { e: EvenementAValider; onFermer: () => void; onRefuser: (motif: string) => Promise<string | null> }) {
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ajouter = (m: string) => setMotif((prev) => (prev.includes(m) ? prev : prev.trim() ? `${prev.trim()} ${m}` : m));

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    const err = await onRefuser(motif.trim());
    if (err) {
      setErreur(err);
      setEnCours(false);
    }
  }

  return (
    <div className={s.fond} onClick={() => !enCours && onFermer()}>
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
        {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
        {erreur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
            <Icon name="alert" />
            <span>{erreur}</span>
          </p>
        )}
        <div className={s.feuilleActions}>
          <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={onFermer}>
            Annuler
          </button>
          <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`} disabled={enCours} onClick={confirmer}>
            {enCours ? "Envoi…" : "Refuser l'événement"}
          </button>
        </div>
      </div>
    </div>
  );
}
