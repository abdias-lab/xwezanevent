import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import Reinit from "./Reinit";

export const metadata: Metadata = { title: "Nouveau mot de passe — XwézanEvent" };

/**
 * Nouveau mot de passe (preview V2). En prod : app/(public)/reinitialiser-mot-de-passe,
 * atteinte via /auth/confirm qui a déjà ouvert la session. ?etat=invalide | termine.
 */
export default function V2Reinitialiser({ searchParams }: { searchParams: { etat?: string } }) {
  const invalide = searchParams.etat === "invalide";
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div style={{ maxWidth: 440, margin: "32px auto 0" }}>
          <h1 className={v.h1}>
            Nouveau <em>mot de passe.</em>
          </h1>
          {invalide ? (
            <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                <Icon name="alert" />
                <span>Ce lien est invalide ou a expiré. Chaque lien ne sert qu&apos;une fois : demande-en un nouveau.</span>
              </p>
              <a href={`${B}/mot-de-passe-oublie`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                Demander un nouveau lien
              </a>
            </div>
          ) : (
            <>
              <p className={v.sous} style={{ margin: "12px 0 24px" }}>
                Choisis un mot de passe d&apos;au moins 8 caractères.
              </p>
              <Reinit etatInitial={searchParams.etat === "termine" ? "termine" : "formulaire"} />
            </>
          )}
        </div>
        <RubanEtats chemin={`${B}/reinitialiser-mot-de-passe`} etats={["normal", "invalide", "termine"]} />
      </main>
      <Footer />
    </div>
  );
}
