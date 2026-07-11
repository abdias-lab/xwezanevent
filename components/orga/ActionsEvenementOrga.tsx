"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionsEvenementOrga({
  eventId,
  titre,
}: {
  eventId: string;
  titre: string;
}) {
  const router = useRouter();
  const [ouverte, setOuverte] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const confirmationValide = saisie.trim() === titre;

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setSaisie("");
    setErreur(null);
  }

  async function confirmer() {
    if (!confirmationValide) return;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/annuler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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

  return (
    <>
      <button type="button" className="btn btn-annuler" onClick={() => setOuverte(true)}>
        Annuler l&apos;événement
      </button>

      {ouverte && (
        <div className="modale-fond" onClick={fermer}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h3>Annuler « {titre} » ?</h3>
            <p>
              Cette action est irréversible en pratique : l&apos;événement sera
              retiré des ventes et du catalogue public, tes billets déjà
              vendus (non utilisés) seront invalidés et refusés au scan, et
              tes demandes de virement en attente seront gelées jusqu&apos;à
              vérification. <strong>Aucune donnée n&apos;est supprimée.</strong>
            </p>
            <div className="champ-bloc">
              <label htmlFor="confirmation">
                Pour confirmer, retape le nom exact de l&apos;événement :{" "}
                <strong>{titre}</strong>
              </label>
              <input
                id="confirmation"
                type="text"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                autoComplete="off"
              />
            </div>
            {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
            <div className="modale-actions">
              <button type="button" className="btn btn-ghost" disabled={enCours} onClick={fermer}>
                Retour
              </button>
              <button
                type="button"
                className="btn btn-annuler"
                disabled={!confirmationValide || enCours}
                onClick={confirmer}
              >
                {enCours ? "…" : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
