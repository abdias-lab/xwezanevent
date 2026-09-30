import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Polices hébergées dans app/fonts (sous-ensemble latin, fichiers variables
// de Google Fonts) : le build ne dépend plus de Google. Depuis le 2026-09-30,
// Google sert certaines polices par des adresses sans extension que
// next/font/google ne sait pas lire, ce qui faisait échouer les builds.
const bricolage = localFont({
  src: [{ path: "./fonts/bricolage-grotesque-latin.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-bricolage",
});

const playfair = localFont({
  src: [{ path: "./fonts/playfair-display-latin-italic.woff2", weight: "400 900", style: "italic" }],
  variable: "--font-playfair",
});

const instrument = localFont({
  src: [
    { path: "./fonts/instrument-sans-latin.woff2", weight: "400 700", style: "normal" },
    { path: "./fonts/instrument-sans-latin-italic.woff2", weight: "400 700", style: "italic" },
  ],
  variable: "--font-instrument",
});

const space = localFont({
  src: [{ path: "./fonts/space-grotesk-latin.woff2", weight: "300 700", style: "normal" }],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "XwézanEvent — Billetterie du Bénin",
  description: "Concerts, festivals, soirées, culture — réservez vos tickets en quelques secondes",
};

export const viewport: Viewport = {
  themeColor: "#151009",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${bricolage.variable} ${instrument.variable} ${playfair.variable} ${space.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
