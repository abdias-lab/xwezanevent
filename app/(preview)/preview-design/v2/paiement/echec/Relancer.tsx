"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { B } from "../../Coquille";

/**
 * Relance du paiement (preview V2), comme components/RelancerPaiement.tsx →
 * POST /api/orders/[id]/reessayer. Proposée uniquement pour un échec
 * définitif (annulé, refusé, indisponible), jamais pour « en attente » (#12).
 */
export default function Relancer({ total }: { total: string }) {
  const [enCours, setEnCours] = useState(false);
  return (
    <button
      type="button"
      className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
      aria-disabled={enCours}
      onClick={() => {
        setEnCours(true);
        setTimeout(() => (window.location.href = `${B}/paiement/retour`), 700);
      }}
    >
      <Icon name="repeat" /> {enCours ? "Redirection vers FedaPay…" : `Réessayer, ${total}`}
    </button>
  );
}
