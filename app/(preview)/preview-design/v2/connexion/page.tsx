import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import Auth from "./Auth";

export const metadata: Metadata = { title: "Connexion — XwézanEvent" };

/** Message selon la page qui a demandé la connexion (?redirect=, chemin interne uniquement). */
const CONTEXTES: Record<string, string> = {
  "/creer": "Pour publier ton événement, connecte-toi ou crée ton compte. C'est gratuit : 8 % de commission, seulement sur les billets vendus.",
  "/compte": "Connecte-toi pour retrouver tes billets et tes commandes.",
  "/orga": "Connecte-toi à ton espace organisateur.",
};

/**
 * Connexion / inscription (preview V2). En prod : app/(public)/connexion + AuthForm.
 * ?vue=inscription ouvre l'onglet inscription ; ?etat=erreur | cree pour relire les états.
 */
export default function V2Connexion({ searchParams }: { searchParams: { vue?: string; etat?: string; redirect?: string } }) {
  // Garde anti-redirection ouverte (BUGS_REFONTE #8) : chemin interne commençant par un seul « / »,
  // sans antislash ni caractère de contrôle (« /\t/site.com » deviendrait « //site.com » dans le navigateur).
  const dest = searchParams.redirect && /^\/(?!\/)[^\\\u0000-\u001F\u007F]*$/.test(searchParams.redirect) ? searchParams.redirect : "/";
  const contexte = CONTEXTES[dest];

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Bon retour <em>parmi nous.</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            {contexte ?? "Connecte-toi pour retrouver tes billets, ou crée ton compte pour publier tes événements."}
          </p>
          <Auth vueInitiale={searchParams.vue === "inscription" ? "inscription" : "connexion"} erreurInitiale={searchParams.etat === "erreur"} creeInitial={searchParams.etat === "cree"} />
        </div>
        <RubanEtats chemin={`${B}/connexion`} etats={["normal", "erreur", "cree"]} />
      </main>
      <Footer />
    </div>
  );
}
