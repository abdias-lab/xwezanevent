"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Seule animation de scroll des previews : fondu + translation de 8px,
 * une fois, sur les sections principales (jamais sur chaque carte).
 * - Sans JS ou avec prefers-reduced-motion : le contenu est simplement visible.
 * - Le contenu déjà visible au chargement n'est pas animé.
 * Le CSS de chaque version définit [data-r="wait"] / [data-r="in"].
 */
export default function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    el.dataset.r = "wait";
    const io = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          el.dataset.r = "in";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
