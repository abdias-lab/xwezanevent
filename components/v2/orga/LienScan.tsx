"use client";

import { useEffect, useState } from "react";
import s from "../espace.module.css";
import Icon from "../Icon";

/**
 * Lien de scan délégué (V2), panneau de la fiche événement repris de la
 * preview (v2/orga/evenements/[id]/Interactifs.tsx), branché sur les routes
 * de prod /api/orga/events/[id]/lien-scan/generer et /revoquer
 * (migration 20260811120000_lien_scan_evenement.sql).
 */
export default function LienScan({ eventId, initial }: { eventId: string; initial: string | null }) {
  const [token, setToken] = useState(initial);
  const [origine, setOrigine] = useState("");
  const [copie, setCopie] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Origine lue côté client (comme la prod) : xwezan.com en ligne, localhost en dev.
  useEffect(() => setOrigine(window.location.origin), []);
  const lien = token ? `${origine}/scan/lien/${token}` : "";

  async function appeler(action: "generer" | "revoquer") {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/lien-scan/${action}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
      } else if (action === "generer") {
        setToken(((data.url as string) ?? "").split("/").pop() || null);
      } else {
        setToken(null);
        setConfirmer(false);
      }
    } catch {
      setErreur("Erreur réseau");
    }
    setEnCours(false);
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible : le lien reste sélectionnable à la main.
    }
  }

  return (
    <section className={s.panneau}>
      <h2 className={s.panneauTitre}>Lien de scan délégué</h2>
      <p className={s.aide} style={{ marginBottom: 12 }}>
        Pour tes contrôleurs à l&apos;entrée : ils scannent les billets de cet événement sans compte, sans accès à tes ventes.
      </p>
      {token ? (
        <div className={s.pile}>
          <div className={s.lien}>
            <Icon name="link" />
            <code>{lien}</code>
            <button type="button" className={s.iconeBtn} aria-label="Copier le lien" onClick={copier}>
              <Icon name={copie ? "check" : "copy"} />
            </button>
          </div>
          <p className={s.note} aria-live="polite">
            {copie ? "Lien copié." : "Toute personne qui a ce lien peut valider des billets."}
          </p>
          {confirmer ? (
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris}`} disabled={enCours} onClick={() => setConfirmer(false)}>
                Garder
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger}`} disabled={enCours} onClick={() => appeler("revoquer")}>
                Révoquer le lien
              </button>
            </div>
          ) : (
            <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setConfirmer(true)}>
              Révoquer
            </button>
          )}
        </div>
      ) : (
        <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnPlein}`} disabled={enCours} onClick={() => appeler("generer")}>
          <Icon name="link" /> Générer un lien de scan
        </button>
      )}
      {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}
    </section>
  );
}
