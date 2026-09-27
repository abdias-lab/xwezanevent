import type { ReactNode } from "react";
import v from "./v2.module.css";
import s from "./espace.module.css";
import { Header, Footer } from "./chrome";

/**
 * Pages d'erreur V2 (404, 500). Pages de résultat : contenu centré. En prod,
 * à créer en app/not-found.tsx, app/error.tsx et app/global-error.tsx
 * (design/BUGS_REFONTE.md, A6) : aujourd'hui Next.js affiche ses pages par
 * défaut, en anglais.
 */
export default function PageErreur({ code, titre, texte, actions, aide }: { code: string; titre: ReactNode; texte: ReactNode; actions: ReactNode; aide?: ReactNode }) {
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
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
