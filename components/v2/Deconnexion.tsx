"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import s from "./espace.module.css";
import Icon from "./Icon";

/**
 * Déconnexion V2 : même comportement que components/BoutonDeconnexion.tsx.
 * Par défaut, habillage de lien de la colonne latérale (.latLien) ; avec
 * `className` (ex. bouton plein de la page « Plus »), la classe fournie
 * porte tout le style.
 */
export default function Deconnexion({ className, style }: { className?: string; style?: CSSProperties }) {
  const router = useRouter();
  async function deconnexion() {
    await creerClientNavigateur().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      className={className ?? s.latLien}
      // Remise à zéro du style natif du bouton seulement : taille, graisse et
      // couleur viennent de .latLien, comme le lien de la preview.
      style={className ? style : { border: 0, background: "none", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "inherit", ...style }}
      onClick={deconnexion}
    >
      <Icon name="logout" size={className ? 16 : 20} /> Se déconnecter
    </button>
  );
}
