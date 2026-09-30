"use client";

import { useState } from "react";
import Icon from "./Icon";

/**
 * « Partager » de la page événement : feuille de partage native (WhatsApp…)
 * sur mobile, sinon copie du lien avec confirmation temporaire.
 */
export default function Partager({ titre, className }: { titre: string; className: string }) {
  const [copie, setCopie] = useState(false);
  async function partager() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titre, url });
      } catch {
        // Partage annulé : rien à faire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible : cas rare, pas de repli.
    }
  }
  return (
    <button type="button" className={className} onClick={partager}>
      <Icon name={copie ? "check" : "link"} />
      {copie ? "Lien copié" : "Partager"}
    </button>
  );
}
