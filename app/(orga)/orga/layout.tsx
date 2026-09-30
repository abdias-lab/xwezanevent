import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase-server";

/**
 * Espace organisateur (/orga et ses sous-pages) : réservé aux organisateurs
 * et aux admins. Un simple acheteur (rôle « visiteur », qui n'a jamais créé
 * d'événement) est envoyé vers /creer : un tableau de bord vide n'a aucun
 * sens pour lui. Sans session, chaque page redirige déjà vers /connexion.
 */
export default async function LayoutOrga({ children }: { children: ReactNode }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profil?.role !== "organisateur" && profil?.role !== "admin") redirect("/creer");
  }
  return <>{children}</>;
}
