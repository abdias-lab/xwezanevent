import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { cheminInterne } from "@/lib/redirection";
import { POLICES_V2 } from "@/components/v2/polices";
import Auth from "@/components/v2/compte/Auth";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";
import c from "@/components/v2/compte/connexion.module.css";

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
 * Ni en-tête ni pied de site : le « Xwézan » de la carte mène à l'accueil,
 * un lien de retour et une ligne de pied réduite (contact) servent de secours.
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
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace} ${c.page}`}>
      <main className={`${v.cont} ${c.zone}`}>
        <div className={c.colonne}>
          <div className={`${c.carte} ${c.entree}`}>
            <header className={c.entete}>
              <p className={c.marque}>
                <Link href="/" aria-label="XwézanEvent, accueil">
                  Xwézan
                </Link>
              </p>
              <h1 className={c.slogan}>Mì wá djawá !</h1>
              <p className={c.accroche}>{CONTEXTES[dest] ?? "Retrouve tes billets, ou crée ton compte pour publier tes événements."}</p>
            </header>
            <Auth vueInitiale={searchParams.vue === "inscription" ? "inscription" : "connexion"} redirect={dest} />
          </div>
          <Link href="/" className={c.retour}>
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </main>
      <footer className={c.pied}>
        © Xwézan · Billetterie du Bénin · <Link href="/contact">Besoin d&apos;aide ?</Link>
      </footer>
    </div>
  );
}
