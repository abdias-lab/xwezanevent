import { cache } from "react";
import { creerClientServeur } from "@/lib/supabase-server";
import { Entete, ESPACES, SE_CONNECTER, PiedDePage, type RolePied } from "./Entete";

/** Rôle de l'utilisateur connecté (profiles.role), null sans session. Lu une fois par requête (en-tête et pied). */
export const lireRole = cache(async (): Promise<RolePied> => {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return (profil?.role as RolePied) ?? "visiteur";
});

/**
 * En-tête public V2 (Server Component) : lit la session pour choisir le
 * bouton de droite, puis dessine l'en-tête commun (Entete.tsx). `epure` :
 * sans logo ni bouton (page /connexion).
 */
export async function Header({ epure = false }: { epure?: boolean } = {}) {
  const role = await lireRole();
  const espace = role ? (ESPACES[role] ?? ESPACES.visiteur) : SE_CONNECTER;
  return <Entete espace={espace} epure={epure} />;
}

/** Pied de page public V2 (Server Component) : colonne Organisateurs selon le rôle. */
export async function Footer() {
  const role = await lireRole();
  return <PiedDePage role={role} />;
}
