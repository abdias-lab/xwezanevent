"use client";

import { useState } from "react";

/**
 * Génération/révocation du lien de scan délégué d'un événement (voir
 * supabase/migrations/20260811120000_lien_scan_evenement.sql). Le lien
 * n'est révélé que dans cette modale, jamais affiché en clair dans le
 * tableau des événements — évite qu'un jeton porteur d'accès traîne à
 * l'écran par défaut (partage d'écran, capture).
 */
export default function LienScan({
  eventId,
  lienInitial,
}: {
  eventId: string;
  /** Jeton actuel (events.lien_scan_token), ou null si aucun lien actif. */
  lienInitial: string | null;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [token, setToken] = useState(lienInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/scan/lien/${token}` : "";

  function fermer() {
    if (enCours) return;
    setOuverte(false);
    setErreur(null);
    setCopie(false);
  }

  async function generer() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/lien-scan/generer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        return;
      }
      const nouveauToken = (data.url as string).split("/").pop() ?? null;
      setToken(nouveauToken);
      setCopie(false);
    } catch {
      setErreur("Erreur réseau");
    } finally {
      setEnCours(false);
    }
  }

  async function revoquer() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/lien-scan/revoquer`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErreur(data?.error ?? "Erreur");
        return;
      }
      setToken(null);
    } catch {
      setErreur("Erreur réseau");
    } finally {
      setEnCours(false);
    }
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible : pas de repli, le lien reste sélectionnable manuellement.
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ padding: "7px 14px", fontSize: "0.8rem" }}
        onClick={() => setOuverte(true)}
      >
        🔗 Lien de scan
      </button>

      {ouverte && (
        <div className="modale-fond" onClick={fermer}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h3>Lien de scan délégué</h3>
            <p>
              Partage ce lien (WhatsApp, SMS) à qui tu veux pour scanner les
              billets de cet événement le jour J — aucun compte requis, et
              rien d&apos;autre n&apos;est accessible avec ce lien (pas de
              dashboard, pas de revenus).
            </p>

            {token ? (
              <>
                <div className="champ-bloc">
                  <label htmlFor="lien-scan-url">Lien actif</label>
                  <input id="lien-scan-url" type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
                </div>
                {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
                <div className="modale-actions">
                  <button type="button" className="btn btn-ghost" disabled={enCours} onClick={revoquer}>
                    Révoquer
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={enCours} onClick={generer}>
                    Régénérer
                  </button>
                  <button type="button" className="btn btn-or" disabled={enCours} onClick={copier}>
                    {copie ? "✅ Copié" : "Copier"}
                  </button>
                </div>
                <p style={{ color: "var(--texte2)", fontSize: "0.85rem", marginTop: 8 }}>
                  Régénérer invalide immédiatement l&apos;ancien lien.
                </p>
              </>
            ) : (
              <>
                {erreur && <p style={{ color: "#c4502e" }}>{erreur}</p>}
                <div className="modale-actions">
                  <button type="button" className="btn btn-ghost" disabled={enCours} onClick={fermer}>
                    Annuler
                  </button>
                  <button type="button" className="btn btn-or" disabled={enCours} onClick={generer}>
                    {enCours ? "…" : "Générer un lien de scan"}
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
