import localFont from "next/font/local";

/**
 * Polices de la refonte V2. Chargées par les layouts des espaces déjà migrés
 * (admin, puis orga, compte, public), jamais par le layout racine tant que
 * tout le site n'est pas en V2 : les pages encore à l'ancien design ne
 * paient pas leur poids. Fichiers hébergés dans app/fonts (voir app/layout.tsx).
 */
const unbounded = localFont({
  src: [{ path: "../../app/fonts/unbounded-latin.woff2", weight: "200 900", style: "normal" }],
  variable: "--v2-display",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [{ path: "../../app/fonts/space-grotesk-latin.woff2", weight: "300 700", style: "normal" }],
  variable: "--v2-body",
  display: "swap",
});

/** Classes à poser sur l'élément qui englobe une page V2. */
export const POLICES_V2 = `${unbounded.variable} ${spaceGrotesk.variable}`;
