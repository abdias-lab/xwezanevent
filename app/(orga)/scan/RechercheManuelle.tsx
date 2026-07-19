"use client";

import { useState } from "react";

interface BilletTrouve {
  ticket_id: string;
  code_qr: string;
  statut: string;
  utilise_le: string | null;
  type_billet: string;
  event_titre: string;
  acheteur_nom: string;
  reference_commande: string;
  commande_creee_le: string;
}

type ValidationResult =
  | { ok: true; nom_titulaire: string; type_billet: string; event_titre: string }
  | { ok: false; raison: string; utilise_le?: string };

const LABEL_STATUT: Record<string, string> = {
  valide: "Valide",
  utilise: "Déjà utilisé",
  annule: "Annulé",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function labelEchec(r: ValidationResult & { ok: false }): string {
  const msgs: Record<string, string> = {
    inconnu: "Billet introuvable",
    annule: "Billet annulé",
    non_autorise: "Non autorisé",
    evenement_termine: "Événement terminé",
    deja_utilise: r.utilise_le ? `Déjà utilisé le ${formatDate(r.utilise_le)}` : "Déjà utilisé",
  };
  return msgs[r.raison] ?? "Refusé";
}

export default function RechercheManuelle() {
  const [q, setQ] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [resultats, setResultats] = useState<BilletTrouve[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enValidation, setEnValidation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  async function rechercher() {
    if (!q.trim()) return;
    setEnCours(true);
    setErreur(null);
    setMessages({});
    try {
      const res = await fetch("/api/scan/recherche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur de recherche");
        setResultats(null);
      } else {
        setResultats(data.billets ?? []);
      }
    } catch {
      setErreur("Connexion impossible.");
      setResultats(null);
    } finally {
      setEnCours(false);
    }
  }

  async function valider(billet: BilletTrouve) {
    setEnValidation(billet.ticket_id);
    try {
      const res = await fetch("/api/scan/manuel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code_qr: billet.code_qr }),
      });
      const data: ValidationResult = await res.json();
      if (data.ok) {
        setMessages((m) => ({ ...m, [billet.ticket_id]: `✓ Validé — ${data.nom_titulaire}` }));
        setResultats((liste) =>
          (liste ?? []).map((b) =>
            b.ticket_id === billet.ticket_id ? { ...b, statut: "utilise" } : b
          )
        );
      } else {
        setMessages((m) => ({ ...m, [billet.ticket_id]: `✗ ${labelEchec(data)}` }));
      }
    } catch {
      setMessages((m) => ({ ...m, [billet.ticket_id]: "✗ Connexion impossible" }));
    } finally {
      setEnValidation(null);
    }
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px 16px",
        gap: 16,
        overflowY: "auto",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <p style={{ color: "#b7a88f", fontSize: "0.9rem", textAlign: "center" }}>
        Recherche par nom de l&apos;acheteur, email, ou référence de commande
        (#XWZ-XXXXXXXX)
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rechercher()}
          placeholder="Nom, email, ou référence…"
          style={{
            flex: 1,
            background: "#1f1710",
            border: "1px solid rgba(228,169,63,0.25)",
            borderRadius: 10,
            padding: "12px 14px",
            color: "#f3eada",
            fontSize: "0.95rem",
          }}
        />
        <button
          type="button"
          onClick={rechercher}
          disabled={enCours || !q.trim()}
          style={{
            background: "#e4a93f",
            color: "#151009",
            border: "none",
            borderRadius: 10,
            padding: "0 18px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {enCours ? "…" : "Chercher"}
        </button>
      </div>

      {erreur && <p style={{ color: "#ff5555", textAlign: "center" }}>{erreur}</p>}

      {resultats && resultats.length === 0 && !erreur && (
        <p style={{ color: "#b7a88f", textAlign: "center" }}>Aucun billet trouvé.</p>
      )}

      {resultats?.map((b) => {
        const peutValider = b.statut === "valide";
        return (
          <div
            key={b.ticket_id}
            style={{
              border: "1px solid rgba(228,169,63,0.18)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{b.acheteur_nom}</div>
            <div style={{ color: "#b7a88f", fontSize: "0.88rem" }}>
              {b.type_billet} · {b.event_titre}
            </div>
            <div style={{ color: "#b7a88f", fontSize: "0.82rem" }}>
              {b.reference_commande} · acheté le {formatDate(b.commande_creee_le)}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
              <span
                style={{
                  fontSize: "0.8rem",
                  padding: "3px 10px",
                  borderRadius: 999,
                  background:
                    b.statut === "valide"
                      ? "rgba(34,255,110,0.15)"
                      : b.statut === "annule"
                        ? "rgba(255,70,70,0.15)"
                        : "rgba(228,169,63,0.15)",
                  color: b.statut === "valide" ? "#22ff6e" : b.statut === "annule" ? "#ff5555" : "#e4a93f",
                }}
              >
                {LABEL_STATUT[b.statut] ?? b.statut}
                {b.statut === "utilise" && b.utilise_le ? ` (${formatDate(b.utilise_le)})` : ""}
              </span>
              {peutValider && (
                <button
                  type="button"
                  onClick={() => valider(b)}
                  disabled={enValidation === b.ticket_id}
                  style={{
                    background: "#e4a93f",
                    color: "#151009",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {enValidation === b.ticket_id ? "…" : "Valider"}
                </button>
              )}
            </div>
            {messages[b.ticket_id] && (
              <div style={{ fontSize: "0.88rem", marginTop: 2 }}>{messages[b.ticket_id]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
