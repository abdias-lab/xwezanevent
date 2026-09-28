"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import FeuilleVerse, { marquerVerse, type VirementAConfirmer } from "./FeuilleVerse";

/**
 * « Marquer comme versé » du tableau de bord : bouton et feuille de la
 * preview Virements, branchés sur la route de prod
 * /api/admin/payouts/[id]/traiter (qui refait le contrôle admin et le J+3).
 * Rendu en fragment : le bouton reste l'enfant direct de la carte
 * (.carteRangee > .btn).
 */
export default function BoutonVerse({ virement }: { virement: VirementAConfirmer }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function verser() {
    setEnCours(true);
    setErreur(null);
    const e = await marquerVerse(virement.id);
    if (e) {
      setErreur(e);
      setEnCours(false);
      return;
    }
    setConfirmer(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setConfirmer(true)}>
        <Icon name="check" /> Marquer comme versé
      </button>
      {confirmer && <FeuilleVerse virement={virement} enCours={enCours} erreur={erreur} onAnnuler={() => setConfirmer(false)} onConfirmer={verser} />}
    </>
  );
}
