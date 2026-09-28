"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { montant as fmtMontant } from "../format";

/**
 * « Marquer comme versé » (V2) : bouton et feuille de confirmation repris de
 * la preview (app/(preview)/preview-design/v2/admin/virements/Virements.tsx),
 * branchés sur la route de prod /api/admin/payouts/[id]/traiter, qui refait
 * le contrôle admin et le J+3. Rendu en fragment : le bouton reste l'enfant
 * direct de la carte (.carteRangee > .btn).
 */
export default function BoutonVerse({
  payoutId,
  montant,
  moyen,
  numero,
  organisateur,
}: {
  payoutId: string;
  montant: number;
  moyen: string;
  numero: string;
  organisateur: string;
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verser() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/traiter`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(false);
        return;
      }
      setConfirmer(false);
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setConfirmer(true)}>
        <Icon name="check" /> Marquer comme versé
      </button>

      {confirmer && (
        <div className={s.fond} onClick={() => !enCours && setConfirmer(false)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-verse-${payoutId}`} onClick={(e) => e.stopPropagation()}>
            <h2 id={`titre-verse-${payoutId}`} className={s.feuilleTitre}>
              As-tu bien envoyé l&apos;argent ?
            </h2>
            <div className={s.recap}>
              <div>
                <span>Montant</span>
                <b className={s.montantOr}>{fmtMontant(montant)}</b>
              </div>
              <div>
                <span>{moyen}</span>
                <b className={s.chiffre}>{numero}</b>
              </div>
              <div>
                <span>Organisateur</span>
                <b>{organisateur}</b>
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
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setConfirmer(false)}>
                Pas encore
              </button>
              <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} autoFocus disabled={enCours} onClick={verser}>
                {enCours ? "Enregistrement…" : "Oui, c'est versé"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
