"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsEvenement({
  eventId,
  titre,
}: {
  eventId: string;
  titre: string;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<"valider" | "refuser" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [modaleRefus, setModaleRefus] = useState(false);
  const [motif, setMotif] = useState("");

  async function valider() {
    setEnCours("valider");
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/valider`, { method: "POST" });
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

  async function confirmerRefus() {
    setEnCours("refuser");
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/refuser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif: motif.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(null);
        return;
      }
      setModaleRefus(false);
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(null);
    }
  }

  return (
    <>
      <div>
        <div className="act">
          <button
            type="button"
            className="btn btn-valide"
            disabled={enCours !== null}
            onClick={valider}
          >
            {enCours === "valider" ? "…" : "✓ Valider"}
          </button>
          <button
            type="button"
            className="btn btn-refus"
            disabled={enCours !== null}
            onClick={() => {
              setErreur(null);
              setModaleRefus(true);
            }}
          >
            Refuser
          </button>
        </div>
        {erreur && !modaleRefus && (
          <p style={{ color: "#c4502e", fontSize: "0.78rem", marginTop: 6, whiteSpace: "normal" }}>
            {erreur}
          </p>
        )}
      </div>

      {modaleRefus && (
        <div className="modale-fond" onClick={() => enCours === null && setModaleRefus(false)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h3>Refuser « {titre} » ?</h3>
            <p>
              L&apos;organisateur recevra un email l&apos;informant du refus. Indique
              un motif pour qu&apos;il puisse corriger et resoumettre son événement
              (facultatif, mais recommandé).
            </p>
            <div className="champ-bloc">
              <label htmlFor="motif">Motif du refus</label>
              <textarea
                id="motif"
                rows={3}
                placeholder="Ex : affiche manquante, description incomplète…"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            </div>
            {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
            <div className="modale-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={enCours !== null}
                onClick={() => setModaleRefus(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-refus"
                disabled={enCours !== null}
                onClick={confirmerRefus}
              >
                {enCours === "refuser" ? "…" : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
