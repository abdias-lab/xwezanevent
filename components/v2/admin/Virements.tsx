"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { montant } from "../format";
import FeuilleVerse, { marquerVerse } from "./FeuilleVerse";

export type VirementVue = {
  id: string;
  montant: number;
  moyen: string;
  numero: string;
  orgaAffiche: string;
  orgaPerso: string;
  orgaTel: string | null;
  evenement: string;
  dateEvenement: string;
  eligible: boolean;
  eligibleLe: string;
  demande: string;
};

/**
 * Virements prêts à envoyer (V2), repris de la preview
 * (app/(preview)/preview-design/v2/admin/virements/Virements.tsx). L'admin
 * envoie l'argent hors plateforme, puis marque la demande versée via
 * /api/admin/payouts/[id]/traiter. Comme dans la preview, la carte reste
 * affichée avec « Traité » ; la page serveur est rafraîchie aussitôt pour
 * que les totaux du haut soient justes (choix du 2026-09-28). La carte,
 * absente de la nouvelle liste serveur, est gardée à sa place côté client.
 */
export default function Virements({ virements }: { virements: VirementVue[] }) {
  const router = useRouter();
  const [traites, setTraites] = useState<Record<string, { heure: string; vue: VirementVue; index: number }>>({});
  const [confirmer, setConfirmer] = useState<VirementVue | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);

  const affiches = useMemo(() => {
    const liste = [...virements];
    for (const t of Object.values(traites).sort((a, b) => a.index - b.index)) {
      if (!liste.some((v) => v.id === t.vue.id)) liste.splice(Math.min(t.index, liste.length), 0, t.vue);
    }
    return liste;
  }, [virements, traites]);

  async function copier(v: VirementVue) {
    try {
      await navigator.clipboard.writeText(v.numero.replace(/\s/g, ""));
      setCopie(v.id);
      setTimeout(() => setCopie((c) => (c === v.id ? null : c)), 2000);
    } catch {
      setCopie(null);
    }
  }

  async function verser(v: VirementVue) {
    setEnCours(true);
    setErreur(null);
    const e = await marquerVerse(v.id);
    setEnCours(false);
    if (e) {
      setErreur(e);
      return;
    }
    const heure = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    const index = affiches.findIndex((x) => x.id === v.id);
    setTraites((p) => ({ ...p, [v.id]: { heure, vue: v, index } }));
    setConfirmer(null);
    router.refresh();
  }

  return (
    <>
      <ul className={s.pile} style={{ gap: 12 }}>
        {affiches.map((v) => {
          const fait = traites[v.id]?.heure;
          const autreNumero = !!v.orgaTel && v.numero.replace(/\s/g, "") !== v.orgaTel.replace(/\s/g, "");
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
                <button
                  type="button"
                  className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
                  onClick={() => {
                    setErreur(null);
                    setConfirmer(v);
                  }}
                >
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
        <FeuilleVerse
          virement={{ id: confirmer.id, montant: confirmer.montant, moyen: confirmer.moyen, numero: confirmer.numero, organisateur: confirmer.orgaAffiche }}
          enCours={enCours}
          erreur={erreur}
          onAnnuler={() => setConfirmer(null)}
          onConfirmer={() => verser(confirmer)}
        />
      )}
    </>
  );
}
