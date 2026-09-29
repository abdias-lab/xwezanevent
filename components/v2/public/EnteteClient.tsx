"use client";

import { useEffect, useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import { Entete, ESPACES, SE_CONNECTER, type Espace } from "./Entete";

/**
 * En-tête public V2 pour les composants client (app/error.tsx, qui ne peut
 * pas rendre le Header serveur) : même dessin, session lue dans le navigateur.
 * Affiche « Se connecter » le temps de la lecture.
 */
export function HeaderClient() {
  const [espace, setEspace] = useState<Espace>(SE_CONNECTER);
  useEffect(() => {
    const supabase = creerClientNavigateur();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      setEspace(ESPACES[profil?.role ?? "visiteur"] ?? ESPACES.visiteur);
    });
  }, []);
  return <Entete espace={espace} />;
}
