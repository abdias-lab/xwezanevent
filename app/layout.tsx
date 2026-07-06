import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "XwézanEvent — Billetterie du Bénin",
  description: "Concerts, festivals, soirées, culture — réservez vos tickets en quelques secondes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${bricolage.variable} ${instrument.variable} ${space.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
