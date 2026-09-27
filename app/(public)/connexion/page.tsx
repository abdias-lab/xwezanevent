import AuthForm from "@/components/AuthForm";
import PanneauMarketing from "@/components/PanneauMarketing";
import { creerClientServeur } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { cheminInterne } from "@/lib/redirection";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion — XwézanEvent",
};

export default async function Connexion({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // On n'accepte que des chemins internes (évite les redirections ouvertes,
  // y compris « //site.com » et « /<tab>/site.com » : voir lib/redirection.ts).
  const dest = cheminInterne(searchParams.redirect);

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Déjà connecté → destination demandée
  if (user) redirect(dest);

  return (
    <div className="split">
      <PanneauMarketing
        stats={[
          { n: "248", l: "Événements / mois" },
          { n: "72k", l: "Festivaliers" },
        ]}
      />

      <div className="cote-form">
        <AuthForm redirect={dest} />
      </div>
    </div>
  );
}
