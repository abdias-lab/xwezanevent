import type { ReactNode } from "react";
import { POLICES_V2 } from "../polices";
import v from "../v2.module.css";
import c from "../contenu.module.css";
import { Header, Footer } from "./Chrome";

export type SectionContenu = { id: string; titre: string; contenu: ReactNode };

/**
 * Gabarit des pages de contenu V2, repris de la preview (v2/PageContenu.tsx).
 * Colonne de lecture alignée à gauche (~68 caractères) ; sommaire cliquable
 * dès 4 sections, collant sur grand écran.
 */
export default function PageContenu({
  surtitre,
  titre,
  intro,
  sections,
  maj,
  avant,
}: {
  surtitre: string;
  titre: ReactNode;
  intro?: ReactNode;
  sections: SectionContenu[];
  maj?: string;
  avant?: ReactNode; // bloc affiché avant les sections (chiffre clé, encadré)
}) {
  const avecSommaire = sections.length >= 4;
  return (
    <div className={`${POLICES_V2} ${v.racine}`}>
      <Header />
      <main className={`${v.cont} ${c.page}`}>
        <div className={c.entete}>
          <span className={c.surtitre}>{surtitre}</span>
          <h1 className={v.h1}>{titre}</h1>
          {intro && <p className={c.intro}>{intro}</p>}
        </div>

        <div className={c.grille} style={{ marginTop: 32 }}>
          {avecSommaire && (
            <nav className={c.sommaire} aria-label="Sommaire">
              <p className={c.sommaireTitre}>Sommaire</p>
              <ol>
                {sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.titre}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <div className={c.texte} style={avecSommaire ? undefined : { gridColumn: "1 / -1" }}>
            {avant}
            {sections.map((s) => (
              <section key={s.id} id={s.id} className={c.section} aria-labelledby={`${s.id}-titre`}>
                <h2 id={`${s.id}-titre`}>{s.titre}</h2>
                {s.contenu}
              </section>
            ))}
            {maj && <p className={c.maj}>{maj}</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
