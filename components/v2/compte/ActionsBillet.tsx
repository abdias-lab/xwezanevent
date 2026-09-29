"use client";

import { useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import Icon from "../Icon";

type WakeLock = { release: () => Promise<void> };

/**
 * Actions d'un billet (V2), reprises de la preview (v2/confirmation/ActionsBillet.tsx) : plein écran (QR maximal sur blanc, écran maintenu
 * allumé si le navigateur le permet) et image à enregistrer pour garder
 * son billet sans réseau. La luminosité ne se règle pas depuis une page web :
 * on le conseille.
 */
export default function ActionsBillet({
  svg,
  png,
  reference,
  fichier,
  titre,
  tarif,
}: {
  svg: string;
  png: string;
  reference: string;
  fichier: string;
  titre: string;
  tarif: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useRef<HTMLButtonElement>(null);
  const declencheur = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const bouton = declencheur.current; // pour lui rendre le focus à la fermeture
    let verrou: WakeLock | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLock> } };
    nav.wakeLock
      ?.request("screen")
      .then((v) => (verrou = v))
      .catch(() => {});
    fermer.current?.focus();
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("keydown", echap);
    const defilement = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      verrou?.release().catch(() => {});
      document.removeEventListener("keydown", echap);
      document.body.style.overflow = defilement;
      bouton?.focus();
    };
  }, [ouvert]);

  return (
    <>
      <div className={s.billetActions}>
        <button ref={declencheur} type="button" className={`${s.btn} ${s.btnGrand}`} onClick={() => setOuvert(true)}>
          <Icon name="qr" /> Plein écran
        </button>
        <a className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} href={png} download={fichier}>
          <Icon name="download" /> Enregistrer
        </a>
      </div>

      {ouvert && (
        <div className={s.pleinEcran} role="dialog" aria-modal="true" aria-label={`QR code du billet ${reference}`}>
          <button ref={fermer} type="button" className={s.pleinEcranFermer} aria-label="Fermer le plein écran" onClick={() => setOuvert(false)}>
            <Icon name="x" size={24} />
          </button>
          <p style={{ fontWeight: 800, fontSize: 18, lineHeight: "24px" }}>{titre}</p>
          <div dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label="QR code à présenter à l'entrée" />
          <p className={s.qrRef}>{reference}</p>
          <p className={s.qrAide}>
            {tarif} · Monte la luminosité de ton écran au maximum.
          </p>
        </div>
      )}
    </>
  );
}
