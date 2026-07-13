"use client";

import { useState } from "react";

export default function RelancerPaiement({ orderId }: { orderId: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function reessayer() {
    if (enCours) return; // jamais deux envois simultanés
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reessayer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
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
      {erreur && <p className="note-paiement">{erreur}</p>}
      <button
        className="btn btn-or btn-large"
        type="button"
        onClick={reessayer}
        disabled={enCours}
        aria-busy={enCours}
      >
        {enCours && <span className="spinner" aria-hidden="true" />}
        {enCours ? "Redirection…" : "Réessayer le paiement"}
      </button>
    </>
  );
}
