"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MoyenPaiement } from "@/lib/payouts";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

const LIBELLE_MOYEN: Record<MoyenPaiement, string> = {
  mtn: "MTN Mobile Money",
  moov: "Moov Money",
  celtiis: "Celtiis Money",
};

/**
 * Miroir client de lib/payouts.ts::normaliserNumeroBenin — dupliqué ici
 * car ce fichier est "server-only" et ne peut pas être importé pour sa
 * valeur d'exécution dans un composant client (seul un `import type` le
 * pourrait). Toute évolution du format doit être répercutée aux deux
 * endroits. Utilisé uniquement pour activer/désactiver le bouton et
 * afficher le récapitulatif — la validation qui compte, et la
 * normalisation réellement stockée, restent côté serveur.
 */
function normaliserNumeroBeninClient(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s().-]/g, "").replace(/^\+?229/, "");
  if (/^01\d{8}$/.test(nettoye)) return nettoye;
  if (/^\d{8}$/.test(nettoye)) return "01" + nettoye;
  return null;
}

/** Formate un numéro normalisé à 10 chiffres pour l'affichage : "0190123456" → "01 90 12 34 56". */
function formaterNumero(n: string): string {
  return n.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

const AIDE_NUMERO =
  "Le numéro doit comporter 10 chiffres et commencer par 01 — exemple : 01 97 12 34 56. " +
  "Un numéro à 8 chiffres (ancien format) est aussi accepté, le 01 sera ajouté automatiquement.";

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
  const [etape, setEtape] = useState<"saisie" | "confirmation">("saisie");
  const [montant, setMontant] = useState(String(disponible));
  const [moyen, setMoyen] = useState<MoyenPaiement>("mtn");
  const [numero, setNumero] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setEtape("saisie");
    setErreur(null);
  }

  const numeroNormalise = normaliserNumeroBeninClient(numero);

  function passerALaConfirmation() {
    setErreur(null);
    if (!numeroNormalise) {
      setErreur(AIDE_NUMERO);
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
                  <select id="moyen" value={moyen} onChange={(e) => setMoyen(e.target.value as MoyenPaiement)}>
                    <option value="mtn">MTN Mobile Money</option>
                    <option value="moov">Moov Money</option>
                    <option value="celtiis">Celtiis Money</option>
                  </select>
                </div>
                <div className="champ-bloc">
                  <label htmlFor="numero">
                    Numéro {LIBELLE_MOYEN[moyen]} <small>(où recevoir l&apos;argent)</small>
                  </label>
                  <input
                    id="numero"
                    type="tel"
                    placeholder="01 97 12 34 56"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    required
                  />
                  <small className="note-virement">{AIDE_NUMERO}</small>
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
                  <strong>{LIBELLE_MOYEN[moyen]}</strong> numéro{" "}
                  <strong>{numeroNormalise ? formaterNumero(numeroNormalise) : numero}</strong>.
                </p>
                {numeroNormalise && !numero.replace(/[\s().-]/g, "").replace(/^\+?229/, "").startsWith("01") && (
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
