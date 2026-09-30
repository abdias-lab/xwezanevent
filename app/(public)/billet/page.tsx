import type { Metadata } from "next";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Retrouver from "@/components/v2/compte/Retrouver";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Retrouver mon billet — XwézanEvent",
  description: "Retrouve rapidement ton billet pour entrer à ton événement.",
};

/** Retrouver mon billet (V2), repris de la preview (v2/billet). */
export default function RetrouverBillet() {
  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Retrouver <em>mon billet.</em>
          </h1>
          <p className={v.sous} style={{ margin: "12px 0 24px" }}>
            Billet perdu, e-mail supprimé ? Indique l&apos;adresse utilisée pour l&apos;achat : on te renvoie tous tes billets payés, avec ou sans compte.
          </p>
          <Retrouver />
        </div>
      </main>
      <Footer />
    </div>
  );
}
