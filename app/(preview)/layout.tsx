import type { Metadata, Viewport } from "next";
import { Unbounded, Space_Grotesk } from "next/font/google";

// Layout autonome des previews de refonte : polices chargées ici uniquement,
// aucun header/footer public, jamais indexé.
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  variable: "--pv-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
