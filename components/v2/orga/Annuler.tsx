"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";

/**
 * Annulation par l'organisateur, avec saisie du nom exact (V2), reprise de
 * la preview (v2/orga/evenements/[id]/Interactifs.tsx) et branchée sur
 * /api/orga/events/[id]/annuler, comme components/orga/ActionsEvenementOrga.tsx.
 */
export default function Annuler({ eventId, titre }: { eventId: string; titre: string }) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ok = saisie.trim() === titre;

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setSaisie("");
    setErreur(null);
  }

  async function confirmer() {
    if (!ok) return;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/annuler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(false);
        return;
      }
      setOuverte(false);
      // La fiche se recharge avec le statut « Annulé » (ce panneau disparaît).
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  return (
    <section className={s.panneau}>
      <h2 className={s.panneauTitre}>Zone sensible</h2>
      <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnPlein}`} onClick={() => setOuverte(true)}>
        Annuler l&apos;événement
      </button>
      {ouverte && (
        <div className={s.fond} onClick={fermer}>
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
            {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={fermer}>
                Retour
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`} disabled={!ok || enCours} onClick={confirmer}>
                {enCours ? "Annulation…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
