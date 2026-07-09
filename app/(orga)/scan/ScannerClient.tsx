"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScanResult =
  | { ok: true; nom_titulaire: string; type_billet: string; event_titre: string }
  | { ok: false; raison: string; utilise_le?: string };

const READER_ID = "xwz-scan-reader";
const RESULT_DURATION_MS = 5000;

function labelRaison(r: ScanResult & { ok: false }): string {
  if (r.raison === "deja_utilise") {
    if (r.utilise_le) {
      const d = new Date(r.utilise_le).toLocaleString("fr-FR", {
        timeZone: "Africa/Porto-Novo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Déjà utilisé\nle ${d}`;
    }
    return "Déjà utilisé";
  }
  const msgs: Record<string, string> = {
    inconnu: "QR non reconnu",
    annule: "Billet annulé",
    non_autorise: "Non autorisé",
  };
  return msgs[r.raison] ?? "Refusé";
}

export default function ScannerClient() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetScan = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    lockedRef.current = false;
    setResult(null);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!alive) return;

      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner as unknown as { stop: () => Promise<void> };

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 270, height: 270 } },
          async (text: string) => {
            if (lockedRef.current || !alive) return;
            lockedRef.current = true;

            try {
              navigator.vibrate?.(80);
            } catch {}

            try {
              const res = await fetch("/api/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code_qr: text }),
              });
              if (!alive) return;
              const data: ScanResult = await res.json();
              setResult(data);
              if (!data.ok) navigator.vibrate?.([100, 80, 300]);
            } catch {
              if (alive) setResult({ ok: false, raison: "inconnu" });
            }

            timerRef.current = setTimeout(resetScan, RESULT_DURATION_MS);
          },
          () => {}
        );
      } catch (e: unknown) {
        if (alive) {
          const msg = e instanceof Error ? e.message : "Caméra inaccessible";
          setCameraError(msg);
        }
      }
    })();

    return () => {
      alive = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      scannerRef.current?.stop().catch(() => {});
    };
  }, [resetScan]);

  const ok = result?.ok === true;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a0704",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-instrument, sans-serif)",
        color: "#f3eada",
        overflow: "hidden",
      }}
    >
      {/* En-tête */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 20px",
          borderBottom: "1px solid rgba(228,169,63,0.18)",
          flexShrink: 0,
        }}
      >
        <a
          href="/orga"
          style={{
            color: "#e4a93f",
            fontSize: "1.5rem",
            lineHeight: 1,
            textDecoration: "none",
          }}
          aria-label="Retour"
        >
          ←
        </a>
        <span
          style={{
            fontWeight: 700,
            fontSize: "1.05rem",
            letterSpacing: "-0.01em",
          }}
        >
          Scan des billets
        </span>
      </div>

      {/* Zone caméra */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 16px",
          gap: 20,
        }}
      >
        {cameraError ? (
          <div style={{ textAlign: "center", padding: 24, maxWidth: 360 }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>📷</div>
            <p style={{ fontSize: "1.05rem", marginBottom: 10 }}>{cameraError}</p>
            <p style={{ color: "#b7a88f", fontSize: "0.88rem" }}>
              Autorise l&apos;accès à la caméra dans les paramètres du navigateur
              puis recharge la page.
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: "#b7a88f", fontSize: "0.9rem", textAlign: "center" }}>
              Pointe la caméra vers le QR code du billet
            </p>
            <div
              id={READER_ID}
              style={{
                width: "100%",
                maxWidth: 380,
                borderRadius: 14,
                overflow: "hidden",
                border: "2px solid rgba(228,169,63,0.25)",
              }}
            />
          </>
        )}
      </div>

      {/* Overlay résultat */}
      {result && (
        <button
          onClick={resetScan}
          aria-label="Fermer le résultat"
          style={{
            position: "absolute",
            inset: 0,
            border: "none",
            cursor: "pointer",
            background: ok
              ? "linear-gradient(160deg,#062b10 0%,#0a3d17 100%)"
              : "linear-gradient(160deg,#2b0606 0%,#3d0a0a 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 28px",
            zIndex: 20,
            gap: 0,
          }}
        >
          {/* Icône */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: ok ? "rgba(34,255,110,0.15)" : "rgba(255,70,70,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
            }}
          >
            <span
              style={{
                fontSize: "3.5rem",
                color: ok ? "#22ff6e" : "#ff5555",
                lineHeight: 1,
              }}
            >
              {ok ? "✓" : "✗"}
            </span>
          </div>

          {ok && result.ok ? (
            <>
              <div
                style={{
                  fontSize: "2.4rem",
                  fontWeight: 800,
                  color: "#22ff6e",
                  textAlign: "center",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  marginBottom: 14,
                }}
              >
                {result.nom_titulaire}
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  color: "#a8f5bc",
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                {result.type_billet}
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  color: "rgba(168,245,188,0.6)",
                  textAlign: "center",
                }}
              >
                {result.event_titre}
              </div>
            </>
          ) : (
            !result.ok && (
              <div
                style={{
                  fontSize: "2.1rem",
                  fontWeight: 800,
                  color: "#ff5555",
                  textAlign: "center",
                  whiteSpace: "pre-line",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                }}
              >
                {labelRaison(result)}
              </div>
            )
          )}

          <div
            style={{
              marginTop: 44,
              color: "rgba(255,255,255,0.3)",
              fontSize: "0.85rem",
            }}
          >
            Toucher pour continuer
          </div>
        </button>
      )}
    </div>
  );
}
