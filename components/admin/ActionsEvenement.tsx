"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "valider" | "refuser";

export default function ActionsEvenement({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<Action | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function agir(action: Action) {
    setEnCours(action);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/${action}`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(null);
        return;
      }
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(null);
    }
  }

  return (
    <div>
      <div className="act">
        <button
          type="button"
          className="btn btn-valide"
          disabled={enCours !== null}
          onClick={() => agir("valider")}
        >
          {enCours === "valider" ? "…" : "✓ Valider"}
        </button>
        <button
          type="button"
          className="btn btn-refus"
          disabled={enCours !== null}
          onClick={() => agir("refuser")}
        >
          {enCours === "refuser" ? "…" : "Refuser"}
        </button>
      </div>
      {erreur && (
        <p style={{ color: "#c4502e", fontSize: "0.78rem", marginTop: 6, whiteSpace: "normal" }}>
          {erreur}
        </p>
      )}
    </div>
  );
}
