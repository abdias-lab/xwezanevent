import { Space_Grotesk, Unbounded } from "next/font/google";

/**
 * Polices de la refonte V2. Chargées par les layouts des espaces déjà migrés
 * (admin, puis orga, compte, public), jamais par le layout racine tant que
 * tout le site n'est pas en V2 : les pages encore à l'ancien design ne
 * paient pas leur poids.
 */
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  variable: "--v2-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--v2-body",
  display: "swap",
});

/** Classes à poser sur l'élément qui englobe une page V2. */
export const POLICES_V2 = `${unbounded.variable} ${spaceGrotesk.variable}`;
