"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../Icon";

/**
 * Relance du paiement (V2), reprise de la preview (v2/paiement/echec/Relancer.tsx)
 * et branchée sur POST /api/orders/[id]/reessayer comme l'ancien
 * RelancerPaiement. Proposée uniquement pour un échec définitif (annulé,
 * refusé, indisponible, expiré), jamais pour « en attente » : la route
 * revérifie de toute façon la transaction précédente (BUGS_REFONTE n°12).
 */
export default function Relancer({ orderId, total }: { orderId: string; total: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function reessayer() {
    if (enCours) return; // jamais deux envois simultanés
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reessayer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      // Gratuite, ou paiement précédent finalement abouti (voir la relance).
      if (res.ok && (data.gratuit || data.finalisee)) {
        window.location.href = `/confirmation?order=${orderId}`;
        return;
      }
      if (res.ok && data.url) {
        window.location.href = data.url; // → nouveau checkout FedaPay
        return;
      }
      setErreur(data.error ?? "Impossible de relancer le paiement.");
      setEnCours(false);
    } catch {
      setErreur("Connexion impossible. Réessaie.");
      setEnCours(false);
    }
  }

  return (
    <>
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0, textAlign: "left" }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}
      <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours} onClick={reessayer}>
        <Icon name="repeat" /> {enCours ? "Redirection vers FedaPay…" : `Réessayer, ${total}`}
      </button>
    </>
  );
}
