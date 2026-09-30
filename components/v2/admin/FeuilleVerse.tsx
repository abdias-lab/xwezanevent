"use client";

import s from "../espace.module.css";
import Icon from "../Icon";
import { montant as fmtMontant } from "../format";

export type VirementAConfirmer = { id: string; montant: number; moyen: string; numero: string; organisateur: string };

/**
 * Feuille « As-tu bien envoyé l'argent ? » de la preview
 * (app/(preview)/preview-design/v2/admin/virements/Virements.tsx), partagée
 * par le tableau de bord (BoutonVerse) et la page Virements.
 */
export default function FeuilleVerse({
  virement,
  enCours,
  erreur,
  onAnnuler,
  onConfirmer,
}: {
  virement: VirementAConfirmer;
  enCours: boolean;
  erreur: string | null;
  onAnnuler: () => void;
  onConfirmer: () => void;
}) {
  return (
    <div className={s.fond} onClick={() => !enCours && onAnnuler()}>
      <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-verse-${virement.id}`} onClick={(e) => e.stopPropagation()}>
        <h2 id={`titre-verse-${virement.id}`} className={s.feuilleTitre}>
          As-tu bien envoyé l&apos;argent ?
        </h2>
        <div className={s.recap}>
          <div>
            <span>Montant</span>
            <b className={s.montantOr}>{fmtMontant(virement.montant)}</b>
          </div>
          <div>
            <span>{virement.moyen}</span>
            <b className={s.chiffre}>{virement.numero}</b>
          </div>
          <div>
            <span>Organisateur</span>
            <b>{virement.organisateur}</b>
          </div>
        </div>
        <p className={s.feuilleTexte}>Marque la demande traitée seulement après l&apos;envoi réel. C&apos;est définitif.</p>
        {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
        {erreur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
            <Icon name="alert" />
            <span>{erreur}</span>
          </p>
        )}
        <div className={s.feuilleActions}>
          <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={onAnnuler}>
            Pas encore
          </button>
          <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} autoFocus disabled={enCours} onClick={onConfirmer}>
            {enCours ? "Enregistrement…" : "Oui, c'est versé"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** POST /api/admin/payouts/[id]/traiter ; renvoie le message d'erreur, ou null si c'est fait. */
export async function marquerVerse(payoutId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/payouts/${payoutId}/traiter`, { method: "POST" });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? "Erreur";
  } catch {
    return "Erreur réseau";
  }
}
