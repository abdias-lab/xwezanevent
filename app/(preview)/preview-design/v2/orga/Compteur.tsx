"use client";

import { useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import { nombre } from "./_orga";

const DUREE_MS = 600;

/**
 * Chiffre qui monte de 0 à sa valeur quand il entre dans l'écran, une seule
 * fois, 600 ms. Rendu serveur = valeur finale (lisible sans JavaScript).
 * prefers-reduced-motion : aucune animation. Les lecteurs d'écran lisent
 * toujours la valeur finale (texte animé masqué pour eux).
 */
export default function Compteur({ valeur }: { valeur: number }) {
  const [affiche, setAffiche] = useState(valeur);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || valeur === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const lancer = () => {
      const debut = performance.now();
      const pas = (t: number) => {
        const p = Math.min(1, (t - debut) / DUREE_MS);
        setAffiche(Math.round(valeur * (1 - Math.pow(1 - p, 3)))); // ease-out cubique
        if (p < 1) raf = requestAnimationFrame(pas);
      };
      setAffiche(0);
      raf = requestAnimationFrame(pas);
    };
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          obs.disconnect();
          lancer();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [valeur]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className={s.chiffre}>
        {nombre(affiche)}
      </span>
      <span className={s.srOnly}>{nombre(valeur)}</span>
    </>
  );
}
