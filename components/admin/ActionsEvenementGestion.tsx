"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ModaleOuverte = "annuler" | "supprimer" | null;

export default function ActionsEvenementGestion({
  eventId,
  titre,
  statut,
}: {
  eventId: string;
  titre: string;
  statut: string;
}) {
  const router = useRouter();
  const [modale, setModale] = useState<ModaleOuverte>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer(action: "annuler" | "supprimer") {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/${action}`, {
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
      setModale(null);
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  return (
    <>
      <div className="act">
        {statut !== "annule" && (
          <button
            type="button"
            className="btn btn-annuler"
            onClick={() => {
              setErreur(null);
              setModale("annuler");
            }}
          >
            Dépublier / Annuler
          </button>
        )}
        <button
          type="button"
          className="btn btn-supprimer"
          onClick={() => {
            setErreur(null);
            setModale("supprimer");
          }}
        >
          Supprimer
        </button>
      </div>

      {modale && (
        <div className="modale-fond" onClick={() => !enCours && setModale(null)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            {modale === "annuler" ? (
              <>
                <h3>Annuler « {titre} » ?</h3>
                <p>
                  L&apos;événement sera retiré du catalogue public et des ventes.
                  Les billets déjà vendus (non utilisés) seront invalidés et
                  refusés au scan. Les demandes de virement en attente de cet
                  organisateur seront gelées. <strong>Aucune donnée n&apos;est supprimée.</strong>
                </p>
              </>
            ) : (
              <>
                <h3>Supprimer « {titre} » ?</h3>
                <p>
                  Suppression <strong>définitive</strong> de l&apos;événement et de
                  sa billetterie. Impossible si des billets ont déjà été
                  vendus — dans ce cas, annule l&apos;événement à la place.
                </p>
              </>
            )}
            {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
            <div className="modale-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={enCours}
                onClick={() => setModale(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className={modale === "annuler" ? "btn btn-annuler" : "btn btn-supprimer"}
                disabled={enCours}
                onClick={() => confirmer(modale)}
              >
                {enCours ? "…" : modale === "annuler" ? "Confirmer l'annulation" : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
