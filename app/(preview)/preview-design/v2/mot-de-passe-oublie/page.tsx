import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import Oubli from "./Oubli";

export const metadata: Metadata = { title: "Mot de passe oublié — XwézanEvent" };

/** Mot de passe oublié (preview V2). En prod : app/(public)/mot-de-passe-oublie. ?etat=envoye pour relire l'état envoyé. */
export default function V2MotDePasseOublie({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Mot de passe <em>oublié ?</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            Indique l&apos;e-mail de ton compte : on t&apos;envoie un lien pour en choisir un nouveau.
          </p>
          <Oubli envoyeInitial={searchParams.etat === "envoye"} />
        </div>
        <RubanEtats chemin={`${B}/mot-de-passe-oublie`} etats={["normal", "envoye"]} />
      </main>
      <Footer />
    </div>
  );
}
