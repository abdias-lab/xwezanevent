import ReinitialiserMotDePasseForm from "@/components/ReinitialiserMotDePasseForm";
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
      <div className="marque">
        <div className="applique" aria-hidden="true" />
        <div style={{ position: "relative" }}>
          <span className="eyebrow">La billetterie du Bénin</span>
          <h1>
            Rejoins la scène <span className="fete">béninoise.</span>
          </h1>
          <p>
            Concerts, festivals, Vodun Days, WeLovEya — tout le Bénin dans ta
            poche, un billet à la fois.
          </p>
        </div>
      </div>

      <div className="cote-form">
        <ReinitialiserMotDePasseForm lienValide={lienValide} />
      </div>
    </div>
  );
}
