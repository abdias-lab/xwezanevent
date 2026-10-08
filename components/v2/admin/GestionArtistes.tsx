"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { initialesArtiste } from "../orga/artistes/initiales";

/**
 * Artistes en ligne, retirés ou refusés (admin, décisions d'Abdias du
 * 2026-10-08) : retirer (réversible), remettre en ligne, supprimer
 * définitivement (seulement sans rattachement ni abonné ; le serveur
 * refait le contrôle sous verrou au moment du clic). Le nombre d'abonnés
 * est affiché sur la carte et annoncé avant un retrait. Une carte traitée
 * reste affichée avec le résultat jusqu'au prochain chargement.
 */
export type ArtisteGere = {
  id: string;
  slug: string;
  nom: string;
  photo: string | null;
  statut: "valide" | "retire" | "refuse";
  meta: string;
  gestionnaire: string;
  abonnes: number;
  rattachements: number;
  motifRefus: string | null;
  retrait: { le: string; par: string | null; motif: string | null } | null;
};

type Action = "retrait" | "remise" | "suppression";
const MOTIF_MAX = 1000;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
const dateHeure = (iso: string) => new Date(iso).toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo", dateStyle: "long", timeStyle: "short" });

function raisonBlocage(a: ArtisteGere): string | null {
  const raisons = [a.rattachements ? `rattaché à ${pluriel(a.rattachements, "événement")}` : null, a.abonnes ? pluriel(a.abonnes, "abonné") : null].filter(Boolean);
  return raisons.length ? `Suppression impossible : ${raisons.join(" et ")}. Utilise le retrait.` : null;
}

export default function GestionArtistes({ artistes, vide }: { artistes: ArtisteGere[]; vide: string }) {
  const router = useRouter();
  const [feuille, setFeuille] = useState<{ a: ArtisteGere; action: Action } | null>(null);
  const [motif, setMotif] = useState("");
  const [prevenir, setPrevenir] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [faits, setFaits] = useState<Record<string, { vue: ArtisteGere; index: number; texte: string }>>({});

  const affiches = useMemo(() => {
    const liste = [...artistes];
    for (const f of Object.values(faits).sort((x, y) => x.index - y.index)) {
      if (!liste.some((a) => a.id === f.vue.id)) liste.splice(Math.min(f.index, liste.length), 0, f.vue);
    }
    return liste;
  }, [artistes, faits]);

  const ouvrir = (a: ArtisteGere, action: Action) => {
    setFeuille({ a, action });
    setMotif("");
    setPrevenir(true);
    setErreur(null);
  };

  async function confirmer() {
    if (!feuille) return;
    const { a, action } = feuille;
    setEnCours(true);
    setErreur(null);
    try {
      const chemin = action === "retrait" ? "retrait" : action === "remise" ? "remise-en-ligne" : "suppression";
      const r = await fetch(`/api/admin/artistes/${a.id}/${chemin}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "retrait" ? { motif, prevenir } : {}),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Erreur");
      const texte =
        action === "retrait"
          ? `Retiré : sa page est en 404 et il n'apparaît plus sur les événements.${prevenir ? (d.prevenus ? ` ${a.gestionnaire} est prévenu par e-mail.` : " Aucun e-mail n'a pu partir.") : " Aucun e-mail envoyé."}`
          : action === "remise"
            ? `Remis en ligne : sa page, ses dates${a.abonnes ? ` et ses ${pluriel(a.abonnes, "abonné")}` : ""} sont de nouveau actifs.`
            : "Supprimé définitivement.";
      setFaits((p) => ({ ...p, [a.id]: { vue: a, index: affiches.findIndex((x) => x.id === a.id), texte } }));
      setFeuille(null);
      router.refresh();
    } catch (e) {
      setErreur((e as Error).message === "Failed to fetch" ? "Erreur réseau, réessaie." : (e as Error).message);
    }
    setEnCours(false);
  }

  if (affiches.length === 0) {
    return (
      <div className={s.vide}>
        <Icon name="users" size={32} />
        <p className={s.videTitre}>{vide}</p>
      </div>
    );
  }

  return (
    <>
      <ul className={s.pile} style={{ gap: 8 }}>
        {affiches.map((a) => {
          const fait = faits[a.id];
          const blocage = raisonBlocage(a);
          return (
            <li key={a.id} className={s.carte}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {a.photo ? <img src={a.photo} alt="" /> : <span>{initialesArtiste(a.nom)}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className={s.carteTitre}>{a.nom}</p>
                  <p className={s.carteMeta}>{a.meta}</p>
                  <p className={s.carteMeta}>
                    <b style={{ color: a.abonnes ? "var(--or)" : undefined }}>{pluriel(a.abonnes, "abonné")}</b> · rattaché à {pluriel(a.rattachements, "événement")}
                  </p>
                  {a.statut === "refuse" && <p className={s.carteMeta}>Motif du refus : {a.motifRefus || "aucun"}</p>}
                  {a.retrait && (
                    <p className={s.carteMeta}>
                      Retiré le {dateHeure(a.retrait.le)}
                      {a.retrait.par ? ` par ${a.retrait.par}` : ""}
                      {a.retrait.motif ? ` · motif : ${a.retrait.motif}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {fait ? (
                <p className={s.alerte} role="status" style={{ marginBottom: 0, marginTop: 12 }}>
                  <Icon name="check" />
                  <span>{fait.texte}</span>
                </p>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  <div className={s.propositionActions}>
                    {a.statut === "valide" && (
                      <>
                        <a href={`/artiste/${a.slug}`} className={`${s.btn} ${s.btnGris}`}>
                          <Icon name="eye" size={16} /> Voir la page
                        </a>
                        <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => ouvrir(a, "retrait")}>
                          Retirer
                        </button>
                      </>
                    )}
                    {a.statut === "retire" && (
                      <button type="button" className={`${s.btn} ${s.btnOr}`} onClick={() => ouvrir(a, "remise")}>
                        <Icon name="check" size={16} /> Remettre en ligne
                      </button>
                    )}
                    <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={!!blocage} onClick={() => ouvrir(a, "suppression")}>
                      Supprimer
                    </button>
                  </div>
                  {blocage && <span className={s.aide}>{blocage}</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {feuille && (
        <div className={s.fond} onClick={() => !enCours && setFeuille(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-gestion" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-gestion" className={s.feuilleTitre}>
              {feuille.action === "retrait"
                ? `Retirer ${feuille.a.nom} ?`
                : feuille.action === "remise"
                  ? `Remettre ${feuille.a.nom} en ligne ?`
                  : `Supprimer définitivement ${feuille.a.nom} ?`}
            </h2>

            {feuille.action === "retrait" && (
              <>
                {feuille.a.abonnes > 0 && (
                  <p className={`${s.alerte} ${s.alerteDanger}`} style={{ marginBottom: 0 }}>
                    <Icon name="alert" />
                    <span>
                      {feuille.a.abonnes > 1 ? (
                        <>
                          <b>{feuille.a.abonnes} personnes suivent cet artiste.</b> Elles ne recevront plus ses nouvelles dates tant qu&apos;il est retiré.
                          Leurs abonnements sont conservés et reviennent à la remise en ligne.
                        </>
                      ) : (
                        <>
                          <b>1 personne suit cet artiste.</b> Elle ne recevra plus ses nouvelles dates tant qu&apos;il est retiré. Son abonnement est
                          conservé et revient à la remise en ligne.
                        </>
                      )}
                    </span>
                  </p>
                )}
                <p className={s.feuilleTexte}>
                  Sa page passe en 404 et il disparaît des événements{feuille.a.rattachements ? ` (${pluriel(feuille.a.rattachements, "rattachement")} conservé${feuille.a.rattachements > 1 ? "s" : ""})` : ""}. Réversible.
                </p>
                <div className={s.champ}>
                  <label htmlFor="motif-retrait">
                    Motif <small>(facultatif, envoyé seulement s&apos;il est saisi)</small>
                  </label>
                  <textarea id="motif-retrait" rows={3} maxLength={MOTIF_MAX} value={motif} onChange={(e) => setMotif(e.target.value)} />
                </div>
                <label className={s.case}>
                  <input type="checkbox" checked={prevenir} onChange={(e) => setPrevenir(e.target.checked)} />
                  Prévenir le compte qui gère cet artiste ({feuille.a.gestionnaire}) par e-mail
                </label>
              </>
            )}
            {feuille.action === "remise" && (
              <p className={s.feuilleTexte}>
                Sa page et ses dates reviennent en ligne{feuille.a.abonnes ? `, et ses ${pluriel(feuille.a.abonnes, "abonné")} recevront de nouveau ses nouvelles dates` : ""}. Aucun e-mail n&apos;est envoyé.
              </p>
            )}
            {feuille.action === "suppression" && (
              <p className={s.feuilleTexte}>La fiche et sa photo sont effacées. C&apos;est irréversible ; la trace reste au journal des actions.</p>
            )}

            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setFeuille(null)}>
                Annuler
              </button>
              <button
                type="button"
                className={`${s.btn} ${feuille.action === "suppression" ? s.btnDanger : s.btnOr} ${s.btnGrand}`}
                disabled={enCours}
                onClick={confirmer}
              >
                {enCours ? "…" : feuille.action === "retrait" ? "Retirer" : feuille.action === "remise" ? "Remettre en ligne" : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
