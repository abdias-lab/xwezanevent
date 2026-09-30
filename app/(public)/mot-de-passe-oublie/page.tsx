import type { Metadata } from "next";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Oubli from "@/components/v2/compte/Oubli";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Mot de passe oublié — XwézanEvent",
};

/** Mot de passe oublié (V2), repris de la preview (v2/mot-de-passe-oublie). */
export default function MotDePasseOublie() {
  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Mot de passe <em>oublié ?</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            Indique l&apos;e-mail de ton compte : on t&apos;envoie un lien pour en choisir un nouveau.
          </p>
          <Oubli />
        </div>
      </main>
      <Footer />
    </div>
  );
}
