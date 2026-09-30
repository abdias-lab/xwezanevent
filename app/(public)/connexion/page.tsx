import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { cheminInterne } from "@/lib/redirection";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Auth from "@/components/v2/compte/Auth";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Connexion — XwézanEvent",
};

/** Message selon la page qui a demandé la connexion (?redirect=, chemin interne uniquement). */
const CONTEXTES: Record<string, string> = {
  "/creer": "Pour publier ton événement, connecte-toi ou crée ton compte. C'est gratuit : 8 % de commission, seulement sur les billets vendus.",
  "/compte": "Connecte-toi pour retrouver tes billets et tes commandes.",
  "/orga": "Connecte-toi à ton espace organisateur.",
};

/**
 * Connexion / inscription (V2), reprise de la preview (v2/connexion).
 * ?vue=inscription ouvre l'onglet inscription.
 */
export default async function Connexion({ searchParams }: { searchParams: { redirect?: string; vue?: string } }) {
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
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Bon retour <em>parmi nous.</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            {CONTEXTES[dest] ?? "Connecte-toi pour retrouver tes billets, ou crée ton compte pour publier tes événements."}
          </p>
          <Auth vueInitiale={searchParams.vue === "inscription" ? "inscription" : "connexion"} redirect={dest} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
