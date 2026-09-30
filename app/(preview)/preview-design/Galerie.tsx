"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { initiales } from "./_data";

type Styles = Record<string, string>;

/**
 * Galerie de la page événement (V2) : affiche principale en 16:9, vignettes
 * dessous dès qu'il y a plus d'une image, visionneuse plein écran au clic.
 * Plusieurs organisateurs mettent des infos importantes (programme, tarifs)
 * dans leurs visuels : la visionneuse montre l'image entière (jamais
 * recadrée), zoomable au pincement. Clavier (Échap, flèches), balayage.
 */
export default function Galerie({
  images,
  titre,
  categorie,
  s,
}: {
  images: string[];
  titre: string;
  categorie: string;
  s: Styles;
}) {
  const [actif, setActif] = useState(0);
  const [ouvert, setOuvert] = useState(false);
  const fermerRef = useRef<HTMLButtonElement>(null);
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const n = images.length;

  const fermer = useCallback(() => {
    setOuvert(false);
    declencheurRef.current?.focus();
  }, []);
  const suivant = useCallback(() => setActif((i) => (i + 1) % n), [n]);
  const precedent = useCallback(() => setActif((i) => (i - 1 + n) % n), [n]);

  useEffect(() => {
    if (!ouvert) return;
    fermerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight" && n > 1) suivant();
      else if (e.key === "ArrowLeft" && n > 1) precedent();
    };
    window.addEventListener("keydown", onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
    };
  }, [ouvert, n, fermer, suivant, precedent]);

  // Balayage à un doigt ; à deux doigts, on laisse le zoom natif.
  const debutX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    debutX.current = e.touches.length === 1 ? e.touches[0].clientX : null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (debutX.current === null || n < 2) return;
    const delta = e.changedTouches[0].clientX - debutX.current;
    debutX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) suivant();
    else precedent();
  };

  if (n === 0) {
    return (
      <div className={s.cadre}>
        <div className={s.repli} role="img" aria-label={`${titre} : pas d'affiche`}>
          <Icon name="image" size={20} className={s.repliIcone} />
          <span className={s.repliMot}>{initiales(titre)}</span>
          <span className={s.repliCat}>{categorie}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={s.galerie}>
      <button ref={declencheurRef} type="button" className={`${s.cadre} ${s.galerieCadre}`} onClick={() => setOuvert(true)} aria-label={`Agrandir l'image ${actif + 1} sur ${n}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.img} src={images[actif]} alt={actif === 0 ? `Affiche : ${titre}` : `${titre} : image ${actif + 1}`} width={640} height={360} decoding="async" />
        <span className={s.galerieCompte} aria-hidden="true">
          <Icon name="eye" size={16} />
          {n > 1 ? `${actif + 1} / ${n}` : "Agrandir"}
        </span>
      </button>

      {n > 1 && (
        <div className={s.vignettes} role="group" aria-label="Images de l'événement">
          {images.map((url, i) => (
            <button key={url + i} type="button" className={`${s.vignette} ${i === actif ? s.vignetteOn : ""}`} onClick={() => setActif(i)} aria-label={`Voir l'image ${i + 1} sur ${n}`} aria-pressed={i === actif}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {ouvert && (
        <div className={s.visionneuse} role="dialog" aria-modal="true" aria-label={`Image ${actif + 1} sur ${n}`} onClick={fermer} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={s.visionneuseImg} src={images[actif]} alt={actif === 0 ? `Affiche : ${titre}` : `${titre} : image ${actif + 1}`} onClick={(e) => e.stopPropagation()} />
          <button ref={fermerRef} type="button" className={`${s.visionneuseBtn} ${s.visionneuseFermer}`} onClick={fermer} aria-label="Fermer">
            <Icon name="x" size={20} />
          </button>
          {n > 1 && (
            <>
              <button
                type="button"
                className={`${s.visionneuseBtn} ${s.visionneusePrec}`}
                onClick={(e) => {
                  e.stopPropagation();
                  precedent();
                }}
                aria-label="Image précédente"
              >
                <Icon name="chevron-right" size={20} />
              </button>
              <button
                type="button"
                className={`${s.visionneuseBtn} ${s.visionneuseSuiv}`}
                onClick={(e) => {
                  e.stopPropagation();
                  suivant();
                }}
                aria-label="Image suivante"
              >
                <Icon name="chevron-right" size={20} />
              </button>
              <span className={s.visionneuseCompte} aria-live="polite">
                {actif + 1} / {n}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
