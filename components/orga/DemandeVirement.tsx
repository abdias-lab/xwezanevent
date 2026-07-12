"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

export default function DemandeVirement({
  eventId,
  titre,
  disponible,
  peutDemander,
  disponibleLe,
}: {
  eventId: string;
  titre: string;
  disponible: number;
  /** Calculé côté serveur (lib/payouts.ts, server-only) — jamais recalculé ici. */
  peutDemander: boolean;
  /** Date formatée (ex. "15 juil 2026"), déjà calculée côté serveur. */
  disponibleLe: string;
}) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  const [montant, setMontant] = useState(String(disponible));
  const [moyen, setMoyen] = useState<"mtn" | "moov">("mtn");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setErreur(null);
  }

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: Number(montant), moyen }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(false);
        return;
      }
      setOuverte(false);
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  if (!peutDemander) {
    return (
      <div className="virement-attente">
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "7px 14px", fontSize: "0.8rem" }}
          disabled
          title={`Les virements sont disponibles 3 jours après la tenue de l'événement, à partir du ${disponibleLe}.`}
        >
          Demander un virement
        </button>
        <span className="note-virement">Disponible le {disponibleLe}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "7px 14px", fontSize: "0.8rem" }}
        onClick={() => setOuverte(true)}
      >
        Demander un virement
      </button>

      {ouverte && (
        <div className="modale-fond" onClick={fermer}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h3>Virement — « {titre} »</h3>
            <p>
              Solde disponible : <strong>{fmt(disponible)} FCFA</strong>{" "}
              (net de la commission de 6%).
            </p>
            <div className="champ-bloc">
              <label htmlFor="montant">Montant (FCFA)</label>
              <input
                id="montant"
                type="number"
                min={1}
                max={disponible}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
              />
            </div>
            <div className="champ-bloc">
              <label htmlFor="moyen">Moyen de paiement</label>
              <select id="moyen" value={moyen} onChange={(e) => setMoyen(e.target.value as "mtn" | "moov")}>
                <option value="mtn">MTN Mobile Money</option>
                <option value="moov">Moov Money</option>
              </select>
            </div>
            {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
            <div className="modale-actions">
              <button type="button" className="btn btn-ghost" disabled={enCours} onClick={fermer}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-or"
                disabled={enCours || Number(montant) <= 0 || Number(montant) > disponible}
                onClick={confirmer}
              >
                {enCours ? "…" : "Envoyer la demande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
