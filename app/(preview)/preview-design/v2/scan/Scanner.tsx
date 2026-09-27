"use client";

import { useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";
import { EVENEMENTS_ORGA, STATUTS_BILLET, billetsDe, type StatutBillet } from "../orga/_orga";

const DUREE_RESULTAT_MS = 5000; // RESULT_DURATION_MS en prod

type Billet = { ref: string; nom: string; tel: string; tarif: string; evenement: string; statut: StatutBillet; entre?: string };

type Resultat =
  | { ok: true; billet: Billet }
  | { ok: false; raison: "deja_utilise" | "inconnu" | "annule" | "evenement_termine"; billet?: Billet };

// Mêmes libellés que labelRaison (app/(orga)/scan/ScannerClient.tsx).
const RAISONS: Record<Exclude<Resultat, { ok: true }>["raison"], string> = {
  deja_utilise: "Déjà utilisé",
  inconnu: "QR non reconnu",
  annule: "Billet annulé",
  evenement_termine: "Événement terminé",
};

const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Billets de démonstration : événements en vente + un annulé, comme en prod (tous les événements de l'organisateur). */
function billetsInitiaux(): Billet[] {
  return EVENEMENTS_ORGA.filter((e) => e.statut === "publie" || e.statut === "annule").flatMap((e) =>
    billetsDe(e).map((b) => ({ ref: b.ref, nom: b.nom, tel: b.tel, tarif: b.tarif, evenement: e.titre, statut: b.statut, entre: b.scanne })),
  );
}

/**
 * Scanner (preview V2). Deux modes comme en prod : caméra (QR) et recherche
 * manuelle. Aucune caméra ni requête ici : les scans sont simulés par la
 * barre « Simuler un scan », réservée à la preview.
 */
export default function Scanner({ cameraRefusee }: { cameraRefusee: boolean }) {
  const [mode, setMode] = useState<"scan" | "recherche">("scan");
  const [billets, setBillets] = useState<Billet[]>(billetsInitiaux);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [cle, setCle] = useState(0); // relance l'animation du minuteur
  const [validesSession, setValidesSession] = useState(0);
  const dernier = useRef<Billet | null>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(minuterie.current), []);

  function afficher(r: Resultat) {
    clearTimeout(minuterie.current);
    setResultat(r);
    setCle((k) => k + 1);
    minuterie.current = setTimeout(() => setResultat(null), DUREE_RESULTAT_MS);
  }

  function valider(ref: string) {
    const h = heure();
    setBillets((prev) => prev.map((b) => (b.ref === ref ? { ...b, statut: "utilise", entre: h } : b)));
    setValidesSession((n) => n + 1);
    return h;
  }

  // Scan simulé : même logique de verdict que valider_billet côté serveur.
  function simuler(cas: "valide" | "meme" | "inconnu" | "annule") {
    if (cas === "inconnu") return afficher({ ok: false, raison: "inconnu" });
    if (cas === "meme") {
      const b = dernier.current && billets.find((x) => x.ref === dernier.current!.ref);
      return afficher(b ? { ok: false, raison: "deja_utilise", billet: b } : { ok: false, raison: "inconnu" });
    }
    if (cas === "annule") {
      const b = billets.find((x) => x.statut === "annule");
      return afficher({ ok: false, raison: "annule", billet: b });
    }
    const b = billets.find((x) => x.statut === "valide");
    if (!b) return afficher({ ok: false, raison: "inconnu" });
    const h = valider(b.ref);
    dernier.current = { ...b, statut: "utilise", entre: h };
    afficher({ ok: true, billet: { ...b, statut: "utilise", entre: h } });
  }

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
            setResultat(null);
          }}
        >
          <Icon name="search" size={20} /> Recherche
        </button>
      </div>

      <p className={s.note} style={{ textAlign: "center", marginBottom: 16 }} aria-live="polite">
        {validesSession === 0 ? "Aucune entrée validée depuis l'ouverture de cette page." : `${validesSession} entrée${validesSession > 1 ? "s" : ""} validée${validesSession > 1 ? "s" : ""} depuis l'ouverture de cette page.`}
      </p>

      {mode === "scan" && (
        <>
          <div aria-live="assertive">{resultat && <Verdict r={resultat} cle={cle} onSuivant={() => setResultat(null)} />}</div>

          {!resultat &&
            (cameraRefusee ? (
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
            ) : (
              <div className={s.viseur} role="img" aria-label="Caméra : place le QR code du billet dans le cadre">
                <div className={s.viseurCadre} />
                <div className={s.viseurLigne} />
                <p className={s.viseurTexte}>Place le QR code dans le cadre</p>
              </div>
            ))}

          {!cameraRefusee && (
            <div className={s.simulateur} role="group" aria-label="Preview : simuler un scan">
              <span className={s.note} style={{ width: "100%", textAlign: "center" }}>
                Preview, simuler un scan :
              </span>
              <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => simuler("valide")}>
                Billet valide
              </button>
              <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => simuler("meme")}>
                Rescanner le même
              </button>
              <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => simuler("inconnu")}>
                QR inconnu
              </button>
              <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => simuler("annule")}>
                Billet annulé
              </button>
            </div>
          )}
        </>
      )}

      {mode === "recherche" && <Recherche billets={billets} onValider={valider} />}

      <p style={{ marginTop: 24, textAlign: "center" }}>
        <a href={`${B}/orga`} className={s.note} style={{ textDecoration: "underline" }}>
          Retour au tableau de bord
        </a>
      </p>
    </div>
  );
}

function Verdict({ r, cle, onSuivant }: { r: Resultat; cle: number; onSuivant: () => void }) {
  const bouton = useRef<HTMLButtonElement>(null);
  useEffect(() => bouton.current?.focus(), [cle]);
  const b = r.billet;
  return (
    <div className={`${s.resultat} ${r.ok ? s.resultatOk : s.resultatKo}`}>
      <Icon name={r.ok ? "check" : "x"} size={96} />
      <p className={s.resultatVerdict}>{r.ok ? "Entrée valide" : RAISONS[r.raison]}</p>
      {b && <p className={s.resultatNom}>{b.nom}</p>}
      {b && (
        <p className={s.resultatDetail}>
          {b.tarif} · {b.evenement}
          {!r.ok && r.raison === "deja_utilise" && b.entre ? `\nEntré à ${b.entre}` : ""}
        </p>
      )}
      {!r.ok && r.raison === "inconnu" && <p className={s.resultatDetail}>Ce QR code ne correspond à aucun billet de tes événements.</p>}
      <div className={s.minuteur} aria-hidden="true">
        <span key={cle} style={{ animationDuration: `${DUREE_RESULTAT_MS}ms` }} />
      </div>
      <button ref={bouton} type="button" className={`${s.btn} ${s.btnGrand}`} onClick={onSuivant}>
        <Icon name="qr" /> Scanner le suivant
      </button>
    </div>
  );
}

function Recherche({ billets, onValider }: { billets: Billet[]; onValider: (ref: string) => string }) {
  const [q, setQ] = useState("");
  const terme = norm(q.trim());
  const trouves = terme.length >= 2 ? billets.filter((b) => norm(`${b.nom} ${b.ref} ${b.tel}`).includes(terme)).slice(0, 20) : [];

  return (
    <>
      <div className={s.recherche}>
        <Icon name="search" size={20} />
        <input
          type="search"
          placeholder="Nom, téléphone ou référence (XWZ-…)"
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
      ) : trouves.length === 0 ? (
        <div className={s.vide}>
          <Icon name="search" size={32} />
          <p className={s.videTitre}>Aucun billet trouvé</p>
          <p className={s.videTexte}>Vérifie l&apos;orthographe, ou cherche par référence (XWZ-…) ou par téléphone.</p>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8, marginTop: 12 }} aria-live="polite">
          {trouves.map((b) => (
            <li key={b.ref} className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>{b.nom}</p>
                  <p className={s.carteMeta}>
                    {b.tarif} · {b.evenement}
                  </p>
                  <p className={`${s.carteMeta} ${s.chiffre}`}>
                    {b.ref} · {b.tel}
                  </p>
                </div>
              </div>
              {b.statut === "valide" ? (
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => onValider(b.ref)}>
                  <Icon name="check" /> Valider l&apos;entrée
                </button>
              ) : (
                <span className={`${s.statut} ${b.statut === "annule" ? s.stBarre : s.stNeutre}`}>
                  {STATUTS_BILLET[b.statut]}
                  {b.statut === "utilise" && b.entre ? ` à ${b.entre}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
