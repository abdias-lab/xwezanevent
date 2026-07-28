"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AfficheEvenement from "@/components/AfficheEvenement";

interface ImageEvenement {
  url: string;
  principale: boolean;
}

/**
 * Bannière + carrousel de la page événement, avec lightbox plein écran au
 * clic sur n'importe quelle image (principale ou secondaire) : plusieurs
 * organisateurs mettent des infos importantes (programme, tarifs) dans
 * leurs visuels secondaires, illisibles en vignette — voir retour organisateur
 * sur "Hollydays Colors" (2026-07-28).
 *
 * Pas de librairie externe : navigation clavier (Échap/flèches), swipe
 * tactile et clic en dehors sont gérés à la main, et le zoom mobile
 * s'appuie sur le pinch-to-zoom natif du navigateur (touch-action:
 * pinch-zoom sur l'image — le viewport de l'app n'impose pas
 * maximum-scale=1, voir app/layout.tsx).
 */
export default function CarrouselEvenement({
  images,
  afficheUrl,
  titre,
  children,
}: {
  images: ImageEvenement[];
  afficheUrl: string | null;
  titre: string;
  /** En-tête (badges, titre, date/lieu) — reçu en enfant pour rester positionné
   * entre la bannière et le carrousel (il chevauche visuellement le bas de la
   * bannière via une marge négative, voir .entete-ev dans globals.css). */
  children: React.ReactNode;
}) {
  const [ouvertIndex, setOuvertIndex] = useState<number | null>(null);

  const indexPrincipale = Math.max(
    0,
    images.findIndex((i) => i.principale || i.url === afficheUrl)
  );

  const fermer = useCallback(() => setOuvertIndex(null), []);
  const suivant = useCallback(
    () => setOuvertIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length]
  );
  const precedent = useCallback(
    () => setOuvertIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length]
  );

  // Clavier (Échap, flèches) + verrouille le scroll de la page derrière la lightbox.
  useEffect(() => {
    if (ouvertIndex === null) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowRight") suivant();
      else if (e.key === "ArrowLeft") precedent();
    }
    window.addEventListener("keydown", onKey);

    const overflowPrecedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrecedent;
    };
  }, [ouvertIndex, fermer, suivant, precedent]);

  // Swipe tactile — ignoré si plus d'un doigt (on laisse le pinch-to-zoom natif faire son travail).
  const debutToucheX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    debutToucheX.current = e.touches.length === 1 ? e.touches[0].clientX : null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (debutToucheX.current === null) return;
    const delta = e.changedTouches[0].clientX - debutToucheX.current;
    debutToucheX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) suivant();
    else precedent();
  }

  return (
    <>
      <div className="banniere">
        <button
          type="button"
          className="banniere-declencheur"
          onClick={() => setOuvertIndex(indexPrincipale)}
          aria-label="Agrandir l'affiche"
        >
          <AfficheEvenement className="photo" src={afficheUrl} alt={titre} fill priority sizes="100vw" />
        </button>
        <div className="voile" aria-hidden="true" />
      </div>

      {children}

      {images.length > 1 && (
        <div className="carrousel-ev" aria-label="Autres photos de l'événement">
          {images.map((img, i) => (
            <button
              type="button"
              className="carrousel-item"
              key={img.url}
              onClick={() => setOuvertIndex(i)}
              aria-label={`Agrandir l'image ${i + 1} sur ${images.length}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" />
            </button>
          ))}
        </div>
      )}

      {ouvertIndex !== null && (
        <div
          className="lightbox-fond"
          onClick={fermer}
          role="dialog"
          aria-modal="true"
          aria-label="Visionneuse d'images"
        >
          <button type="button" className="lightbox-fermer" onClick={fermer} aria-label="Fermer">
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                className="lightbox-nav lightbox-prec"
                onClick={(e) => {
                  e.stopPropagation();
                  precedent();
                }}
                aria-label="Image précédente"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox-nav lightbox-suiv"
                onClick={(e) => {
                  e.stopPropagation();
                  suivant();
                }}
                aria-label="Image suivante"
              >
                ›
              </button>
            </>
          )}

          <div
            className="lightbox-image-wrap"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[ouvertIndex].url} alt="" className="lightbox-image" />
          </div>

          {images.length > 1 && (
            <div className="lightbox-compteur">
              {ouvertIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
