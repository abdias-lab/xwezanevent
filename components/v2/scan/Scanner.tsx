"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import c from "./camera.module.css";
import Icon from "../Icon";
import { heureBenin } from "../format";

const READER_ID = "xwz-scan-reader";
const DUREE_RESULTAT_MS = 5000; // RESULT_DURATION_MS de l'ancien ScannerClient

type ReponseScan =
  | { ok: true; nom_titulaire: string; type_billet: string; event_titre: string; compteur?: { scannes: number; total: number } }
  | { ok: false; raison: string; utilise_le?: string };

// Libellés de l'ancien ScannerClient (labelRaison), design de la preview.
const RAISONS: Record<string, string> = {
  deja_utilise: "Déjà utilisé",
  inconnu: "QR non reconnu",
  annule: "Billet annulé",
  non_autorise: "Non autorisé",
  evenement_termine: "Événement terminé",
};

type BilletTrouve = {
  ticket_id: string;
  code_qr: string;
  statut: string;
  utilise_le: string | null;
  type_billet: string;
  event_titre: string;
  acheteur_nom: string;
  reference_commande: string;
};

/**
 * Scanner V2 (preview : v2/scan/Scanner.tsx), branché sur les routes de prod.
 * Deux modes : caméra (html5-qrcode) et recherche manuelle (serveur).
 * - Organisateur : /api/scan, /api/scan/recherche, /api/scan/manuel ;
 * - lien délégué : routes /api/scan/lien/* + `extraBody = { token }` (le
 *   jeton est revérifié côté serveur à chaque requête, jamais l'event_id).
 * Pas de téléphone de l'acheteur (décision du 2026-09-28).
 */
export default function Scanner({
  apiScan = "/api/scan",
  apiRecherche = "/api/scan/recherche",
  apiManuel = "/api/scan/manuel",
  extraBody,
  compteurInitial,
  retour = true,
  delegue = false,
}: {
  apiScan?: string;
  apiRecherche?: string;
  apiManuel?: string;
  extraBody?: Record<string, string>;
  /** Billets scannés / vendus (lien délégué) ; sinon compteur de session. */
  compteurInitial?: { scannes: number; total: number };
  retour?: boolean;
  delegue?: boolean;
}) {
  const [mode, setMode] = useState<"scan" | "recherche">("scan");
  const [resultat, setResultat] = useState<ReponseScan | null>(null);
  const [cle, setCle] = useState(0); // relance l'animation du minuteur
  const [cameraRefusee, setCameraRefusee] = useState(false);
  const [compteur, setCompteur] = useState(compteurInitial);
  const [validesSession, setValidesSession] = useState(0);
  const verrou = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  const scanneur = useRef<{ stop: () => Promise<void> } | null>(null);
  // Lu à jour dans le rappel caméra sans redémarrer la caméra (coûteux).
  const config = useRef({ apiScan, extraBody });
  config.current = { apiScan, extraBody };

  const suivant = useCallback(() => {
    clearTimeout(minuterie.current);
    verrou.current = false;
    setResultat(null);
  }, []);

  const compterValidation = useCallback((cpt?: { scannes: number; total: number }) => {
    if (cpt) setCompteur(cpt);
    setValidesSession((n) => n + 1);
  }, []);

  // Caméra démarrée une seule fois ; la zone reste montée (masquée en CSS)
  // quand on passe à la recherche : html5-qrcode suppose que son nœud existe
  // encore à l'arrêt (voir l'ancien ScannerClient).
  useEffect(() => {
    let vivant = true;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!vivant) return;
      const scanner = new Html5Qrcode(READER_ID);
      scanneur.current = scanner as unknown as { stop: () => Promise<void> };
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (l: number, h: number) => ({ width: Math.floor(Math.min(l, h) * 0.64), height: Math.floor(Math.min(l, h) * 0.64) }) },
          async (texte: string) => {
            if (verrou.current || !vivant) return;
            verrou.current = true;
            try {
              navigator.vibrate?.(80);
            } catch {}
            let r: ReponseScan;
            try {
              const res = await fetch(config.current.apiScan, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code_qr: texte, ...config.current.extraBody }),
              });
              r = await res.json();
            } catch {
              r = { ok: false, raison: "inconnu" };
            }
            if (!vivant) return;
            if (r.ok) compterValidation(r.compteur);
            else navigator.vibrate?.([100, 80, 300]);
            setResultat(r);
            setCle((k) => k + 1);
            minuterie.current = setTimeout(suivant, DUREE_RESULTAT_MS);
          },
          () => {},
        );
      } catch {
        if (vivant) setCameraRefusee(true);
      }
    })();
    return () => {
      vivant = false;
      clearTimeout(minuterie.current);
      scanneur.current?.stop().catch(() => {});
    };
  }, [suivant, compterValidation]);

  return (
    <div style={{ maxWidth: 560 }}>
      <div className={s.modes} role="tablist" aria-label="Mode de contrôle">
        <button type="button" role="tab" aria-selected={mode === "scan"} className={`${s.mode} ${mode === "scan" ? s.modeOn : ""}`} onClick={() => setMode("scan")}>
          <Icon name="qr" size={20} /> Scanner
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "recherche"}
          className={`${s.mode} ${mode === "recherche" ? s.modeOn : ""}`}
          onClick={() => {
            setMode("recherche");
            suivant();
          }}
        >
          <Icon name="search" size={20} /> Recherche
        </button>
      </div>

      <p className={s.note} style={{ textAlign: "center", marginBottom: 16 }} aria-live="polite">
        {compteur
          ? `${compteur.scannes} / ${compteur.total} billets scannés`
          : validesSession === 0
            ? "Aucune entrée validée depuis l'ouverture de cette page."
            : `${validesSession} entrée${validesSession > 1 ? "s" : ""} validée${validesSession > 1 ? "s" : ""} depuis l'ouverture de cette page.`}
      </p>

      <div style={{ display: mode === "scan" ? "block" : "none" }}>
        <div aria-live="assertive">{resultat && <Verdict r={resultat} cle={cle} delegue={delegue} onSuivant={suivant} />}</div>

        {cameraRefusee ? (
          !resultat && (
            <div className={s.vide}>
              <Icon name="camera" size={32} />
              <p className={s.videTitre}>Caméra inaccessible</p>
              <p className={s.videTexte}>
                Autorise l&apos;accès à la caméra dans les réglages du navigateur, puis recharge la page. En attendant, tu peux contrôler les billets par nom ou
                référence.
              </p>
              <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setMode("recherche")}>
                <Icon name="search" /> Recherche manuelle
              </button>
            </div>
          )
        ) : (
          // Toujours monté (la caméra y est attachée), seulement masqué pendant un verdict.
          <div className={s.viseur} role="img" aria-label="Caméra : place le QR code du billet dans le cadre" style={resultat ? { display: "none" } : undefined}>
            <div id={READER_ID} className={c.flux} />
            <div className={s.viseurCadre} />
            <div className={s.viseurLigne} />
            <p className={s.viseurTexte}>Place le QR code dans le cadre</p>
          </div>
        )}
      </div>

      {mode === "recherche" && <Recherche apiRecherche={apiRecherche} apiManuel={apiManuel} extraBody={extraBody} onValidation={compterValidation} />}

      {retour && (
        <p style={{ marginTop: 24, textAlign: "center" }}>
          <Link href="/orga" className={s.note} style={{ textDecoration: "underline" }}>
            Retour au tableau de bord
          </Link>
        </p>
      )}
    </div>
  );
}

function Verdict({ r, cle, delegue, onSuivant }: { r: ReponseScan; cle: number; delegue: boolean; onSuivant: () => void }) {
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => bouton.current?.focus(), [cle]);
  return (
    <div className={`${s.resultat} ${r.ok ? s.resultatOk : s.resultatKo}`}>
      <Icon name={r.ok ? "check" : "x"} size={96} />
      <p className={s.resultatVerdict}>{r.ok ? "Entrée valide" : (RAISONS[r.raison] ?? "Refusé")}</p>
      {r.ok && <p className={s.resultatNom}>{r.nom_titulaire}</p>}
      {r.ok && (
        <p className={s.resultatDetail}>
          {r.type_billet} · {r.event_titre}
        </p>
      )}
      {/* La route ne renvoie que l'heure d'entrée pour un billet déjà utilisé (pas son titulaire). */}
      {!r.ok && r.raison === "deja_utilise" && r.utilise_le && <p className={s.resultatDetail}>Entré à {heureBenin(r.utilise_le)}</p>}
      {!r.ok && r.raison === "inconnu" && (
        <p className={s.resultatDetail}>Ce QR code ne correspond à aucun billet {delegue ? "de cet événement" : "de tes événements"}.</p>
      )}
      <div className={s.minuteur} aria-hidden="true">
        <span key={cle} style={{ animationDuration: `${DUREE_RESULTAT_MS}ms` }} />
      </div>
      <button ref={bouton} type="button" className={`${s.btn} ${s.btnGrand}`} onClick={onSuivant}>
        <Icon name="qr" /> Scanner le suivant
      </button>
    </div>
  );
}

function Recherche({
  apiRecherche,
  apiManuel,
  extraBody,
  onValidation,
}: {
  apiRecherche: string;
  apiManuel: string;
  extraBody?: Record<string, string>;
  onValidation: (cpt?: { scannes: number; total: number }) => void;
}) {
  const [q, setQ] = useState("");
  const [trouves, setTrouves] = useState<BilletTrouve[] | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const [refus, setRefus] = useState<Record<string, string>>({});
  const terme = q.trim();

  // Recherche serveur dès 2 caractères, comme le filtre en direct de la preview.
  useEffect(() => {
    if (terme.length < 2) {
      setTrouves(null);
      return;
    }
    let actuel = true;
    const t = setTimeout(async () => {
      setEnCours(true);
      setErreur(null);
      try {
        const res = await fetch(apiRecherche, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: terme, ...extraBody }) });
        const data = await res.json().catch(() => null);
        if (!actuel) return;
        if (!res.ok) setErreur(data?.error ?? "Erreur de recherche");
        else setTrouves((data?.billets ?? []).slice(0, 20));
      } catch {
        if (actuel) setErreur("Connexion impossible.");
      }
      if (actuel) setEnCours(false);
    }, 350);
    return () => {
      actuel = false;
      clearTimeout(t);
    };
  }, [terme, apiRecherche, extraBody]);

  async function valider(b: BilletTrouve) {
    setValidation(b.ticket_id);
    try {
      const res = await fetch(apiManuel, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code_qr: b.code_qr, ...extraBody }) });
      const data: ReponseScan = await res.json();
      if (data.ok) {
        setTrouves((l) => (l ?? []).map((x) => (x.ticket_id === b.ticket_id ? { ...x, statut: "utilise", utilise_le: new Date().toISOString() } : x)));
        onValidation(data.compteur);
      } else {
        setRefus((m) => ({ ...m, [b.ticket_id]: RAISONS[data.raison] ?? "Refusé" }));
      }
    } catch {
      setRefus((m) => ({ ...m, [b.ticket_id]: "Connexion impossible" }));
    }
    setValidation(null);
  }

  return (
    <>
      <div className={s.recherche}>
        <Icon name="search" size={20} />
        <input
          type="search"
          placeholder="Nom, e-mail ou référence (XWZ-…)"
          aria-label="Rechercher un billet"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {terme.length < 2 ? (
        <p className={s.note} style={{ textAlign: "center", marginTop: 16 }}>
          Pour un billet dont le QR code ne passe pas : écran cassé, téléphone déchargé, impression abîmée.
        </p>
      ) : erreur ? (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginTop: 12 }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      ) : trouves === null || enCours ? (
        <p className={s.note} style={{ textAlign: "center", marginTop: 16 }} aria-live="polite">
          Recherche…
        </p>
      ) : trouves.length === 0 ? (
        <div className={s.vide}>
          <Icon name="search" size={32} />
          <p className={s.videTitre}>Aucun billet trouvé</p>
          <p className={s.videTexte}>Vérifie l&apos;orthographe, ou cherche par référence (XWZ-…) ou par e-mail.</p>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8, marginTop: 12 }} aria-live="polite">
          {trouves.map((b) => (
            <li key={b.ticket_id} className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>{b.acheteur_nom}</p>
                  <p className={s.carteMeta}>
                    {b.type_billet} · {b.event_titre}
                  </p>
                  <p className={`${s.carteMeta} ${s.chiffre}`}>{b.reference_commande}</p>
                  {refus[b.ticket_id] && (
                    <p className={s.carteMeta} style={{ color: "var(--danger)" }}>
                      {refus[b.ticket_id]}
                    </p>
                  )}
                </div>
              </div>
              {b.statut === "valide" ? (
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={validation !== null} onClick={() => valider(b)}>
                  <Icon name="check" /> {validation === b.ticket_id ? "Validation…" : "Valider l'entrée"}
                </button>
              ) : (
                <span className={`${s.statut} ${b.statut === "annule" ? s.stBarre : s.stNeutre}`}>
                  {b.statut === "annule" ? "Annulé" : "Utilisé"}
                  {b.statut === "utilise" && b.utilise_le ? ` à ${heureBenin(b.utilise_le)}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
