"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { normaliserNumero, operateursPays, aidePays, exemplePays, formaterNumero } from "@/lib/telephone";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

export default function DemandeVirement({
  eventId,
  titre,
  disponible,
  tauxCommission,
  paysCode,
  peutDemander,
  disponibleLe,
}: {
  eventId: string;
  titre: string;
  disponible: number;
  /** Taux de commission de CET événement (events.taux_commission, 8% par défaut, peut être 0 sur accord commercial). */
  tauxCommission: number;
  /** Pays de CET événement (events.pays_code) — détermine les opérateurs proposés et le format de numéro attendu, voir lib/telephone.ts. */
  paysCode: string;
  /** Calculé côté serveur (lib/payouts.ts, server-only) — jamais recalculé ici. */
  peutDemander: boolean;
  /** Date formatée (ex. "15 juil 2026"), déjà calculée côté serveur. */
  disponibleLe: string;
}) {
  const router = useRouter();
  const operateurs = operateursPays(paysCode);
  const aideNumero = aidePays(paysCode);
  const [ouverte, setOuverte] = useState(false);
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [montant, setMontant] = useState(String(disponible));
  const [moyen, setMoyen] = useState(operateurs[0]?.code ?? "");
  const [numero, setNumero] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setEtape("saisie");
    setErreur(null);
  }

  const libelleMoyen = operateurs.find((o) => o.code === moyen)?.nom ?? moyen;
  const numeroNormalise = normaliserNumero(paysCode, numero);

  function passerALaConfirmation() {
    setErreur(null);
    if (!numeroNormalise) {
      setErreur(aideNumero);
      return;
    }
    setEtape("confirmation");
  }

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: Number(montant), moyen, numero }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEnCours(false);
        setEtape("saisie");
        return;
      }
      setOuverte(false);
      setEtape("saisie");
      router.refresh();
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
      setEtape("saisie");
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
            {etape === "saisie" ? (
              <>
                <h3>Virement — « {titre} »</h3>
                <p>
                  Solde disponible : <strong>{fmt(disponible)} FCFA</strong>{" "}
                  {tauxCommission > 0
                    ? `(net de la commission de ${Math.round(tauxCommission * 100)}%).`
                    : "(aucune commission sur cet événement)."}
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
                  <select id="moyen" value={moyen} onChange={(e) => setMoyen(e.target.value)}>
                    {operateurs.map((o) => (
                      <option key={o.code} value={o.code}>
                        {o.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="champ-bloc">
                  <label htmlFor="numero">
                    Numéro {libelleMoyen} <small>(où recevoir l&apos;argent)</small>
                  </label>
                  <input
                    id="numero"
                    type="tel"
                    placeholder={exemplePays(paysCode)}
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    required
                  />
                  <small className="note-virement">{aideNumero}</small>
                </div>
                {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
                <div className="modale-actions">
                  <button type="button" className="btn btn-ghost" disabled={enCours} onClick={fermer}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="btn btn-or"
                    disabled={
                      enCours ||
                      Number(montant) <= 0 ||
                      Number(montant) > disponible ||
                      !numeroNormalise
                    }
                    onClick={passerALaConfirmation}
                  >
                    Continuer
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Confirmer le virement</h3>
                <p>
                  Vous allez recevoir <strong>{fmt(Number(montant))} FCFA</strong> sur le{" "}
                  <strong>{libelleMoyen}</strong> numéro{" "}
                  <strong>{numeroNormalise ? formaterNumero(numeroNormalise) : numero}</strong>.
                </p>
                {paysCode === "bj" &&
                  numeroNormalise &&
                  !numero.replace(/[\s().-]/g, "").replace(/^\+?229/, "").startsWith("01") && (
                    <p style={{ color: "var(--texte2)", fontSize: "0.85rem" }}>
                      (préfixe 01 ajouté automatiquement à ton numéro à 8 chiffres)
                    </p>
                  )}
                <p style={{ color: "var(--texte2)", fontSize: "0.85rem" }}>
                  Vérifiez bien ce numéro avant de confirmer — c&apos;est là que l&apos;argent sera envoyé.
                </p>
                {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
                <div className="modale-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={enCours}
                    onClick={() => setEtape("saisie")}
                  >
                    ← Modifier
                  </button>
                  <button type="button" className="btn btn-or" disabled={enCours} onClick={confirmer}>
                    {enCours ? "…" : "Confirmer l'envoi"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
