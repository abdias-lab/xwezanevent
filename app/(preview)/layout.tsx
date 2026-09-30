import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

// Layout autonome des previews de refonte : polices chargées ici uniquement,
// aucun header/footer public, jamais indexé. Fichiers hébergés dans app/fonts.
const unbounded = localFont({
  src: [{ path: "../fonts/unbounded-latin.woff2", weight: "200 900", style: "normal" }],
  variable: "--pv-display",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [{ path: "../fonts/space-grotesk-latin.woff2", weight: "300 700", style: "normal" }],
  variable: "--pv-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Preview design — Xwézan",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${unbounded.variable} ${spaceGrotesk.variable}`}>{children}</div>;
}
