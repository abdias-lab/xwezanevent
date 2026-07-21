import AuthForm from "@/components/AuthForm";
import { creerClientServeur } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — XwézanEvent",
};

export default async function Connexion({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // On n'accepte que des chemins internes (évite les redirections ouvertes)
  const dest =
    searchParams.redirect && searchParams.redirect.startsWith("/")
      ? searchParams.redirect
      : "/";

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Déjà connecté → destination demandée
  if (user) redirect(dest);

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
            Concerts, festivals, soirées — tout le Bénin dans ta poche, un
            billet à la fois.
          </p>
          <div className="stats">
            <div className="stat">
              <div className="n">248</div>
              <div className="l">Événements / mois</div>
            </div>
            <div className="stat">
              <div className="n">72k</div>
              <div className="l">Festivaliers</div>
            </div>
          </div>
        </div>
      </div>

      <div className="cote-form">
        <AuthForm redirect={dest} />
      </div>
    </div>
  );
}
