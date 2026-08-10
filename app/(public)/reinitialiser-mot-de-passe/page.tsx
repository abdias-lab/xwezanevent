import ReinitialiserMotDePasseForm from "@/components/ReinitialiserMotDePasseForm";
import PanneauMarketing from "@/components/PanneauMarketing";
import { creerClientServeur } from "@/lib/supabase-server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — XwézanEvent",
};

/**
 * La session est déjà établie (ou non) AVANT que cette page ne se rende :
 * /auth/confirm a échangé le token_hash du lien email contre une session
 * posée en cookies côté serveur, puis a redirigé ici. Il suffit de vérifier
 * si cette session existe — aucun parsing de hash/token côté client.
 */
export default async function ReinitialiserMotDePasse({
  searchParams,
}: {
  searchParams: { erreur?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const lienValide = !!session && searchParams.erreur !== "lien_invalide";

  return (
    <div className="split">
      <PanneauMarketing />

      <div className="cote-form">
        <ReinitialiserMotDePasseForm lienValide={lienValide} />
      </div>
    </div>
  );
}
