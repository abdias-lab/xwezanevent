import { creerClientServeur } from "@/lib/supabase-server";
import { Entete, ESPACES, SE_CONNECTER, Footer } from "./Entete";

export { Footer };

/**
 * En-tête public V2 (Server Component) : lit la session pour choisir le
 * bouton de droite, puis dessine l'en-tête commun (Entete.tsx).
 */
export async function Header() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let espace = SE_CONNECTER;
  if (user) {
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    espace = ESPACES[profil?.role ?? "visiteur"] ?? ESPACES.visiteur;
  }
  return <Entete espace={espace} />;
}
