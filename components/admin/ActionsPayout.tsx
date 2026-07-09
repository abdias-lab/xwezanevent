"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsPayout({ payoutId }: { payoutId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function marquerTraite() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/payouts/${payoutId}/traiter`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(false);
        return;
      }
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  return (
    <div className="act">
      <button
        type="button"
        className="btn btn-or"
        style={{ padding: "7px 14px", fontSize: "0.8rem" }}
        disabled={enCours}
        onClick={marquerTraite}
      >
        {enCours ? "…" : "Marquer comme traité"}
      </button>
      {erreur && (
        <span style={{ color: "#c4502e", fontSize: "0.78rem", marginLeft: 8 }}>
          {erreur}
        </span>
      )}
    </div>
  );
}
