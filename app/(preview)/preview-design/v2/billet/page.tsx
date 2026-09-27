import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import Retrouver from "./Retrouver";

export const metadata: Metadata = { title: "Retrouver mon billet — XwézanEvent" };

/** Retrouver mon billet (preview V2). En prod : app/(public)/billet. ?etat=envoye pour relire l'état envoyé. */
export default function V2Billet({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div style={{ maxWidth: 440, margin: "32px auto 0" }}>
          <h1 className={v.h1}>
            Retrouver <em>mon billet.</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            Billet perdu, e-mail supprimé ? Indique l&apos;adresse utilisée pour l&apos;achat : on te renvoie tous tes billets payés, avec ou sans compte.
          </p>
          <Retrouver envoyeInitial={searchParams.etat === "envoye"} />
        </div>
        <RubanEtats chemin={`${B}/billet`} etats={["normal", "envoye"]} />
      </main>
      <Footer />
    </div>
  );
}
