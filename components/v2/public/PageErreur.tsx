import type { ReactNode } from "react";
import { POLICES_V2 } from "../polices";
import v from "../v2.module.css";
import s from "../espace.module.css";
import { Footer } from "./Entete";

/**
 * Pages d'erreur V2 (404, 500), reprises de la preview (v2/PageErreur.tsx).
 * Pages de résultat : contenu centré. L'en-tête est passé en paramètre :
 * <Header /> (serveur) pour app/not-found.tsx, <HeaderClient /> pour
 * app/error.tsx et app/global-error.tsx, qui sont des composants client.
 */
export default function PageErreur({
  entete,
  code,
  titre,
  texte,
  actions,
  aide,
}: {
  entete: ReactNode;
  code: string;
  titre: ReactNode;
  texte: ReactNode;
  actions: ReactNode;
  aide?: ReactNode;
}) {
  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      {entete}
      <main className={v.cont} style={{ padding: "64px 16px 96px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
          <p aria-hidden="true" style={{ font: "900 clamp(4.5rem, 22vw, 8rem)/1 var(--display)", color: "var(--or)" }}>
            {code}
          </p>
          <h1 className={v.h1}>{titre}</h1>
          <p className={v.sous} style={{ margin: 0 }}>
            {texte}
          </p>
          <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 360, marginTop: 8 }}>{actions}</div>
          {aide && (
            <p className={s.note} style={{ marginTop: 8 }}>
              {aide}
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
