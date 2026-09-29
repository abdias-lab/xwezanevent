import s from "./v2.module.css";
import { Header, Footer } from "./chrome";
import Affiche from "../Affiche";
import Icon from "../Icon";
import Programme from "../Programme";
import Reveal from "../Reveal";
import { EVENEMENTS, dateCourte, etatDepuis } from "../_data";

const DETAIL = "/preview-design/v2/evenement";

export default function V2Accueil({ searchParams }: { searchParams: { etat?: string } }) {
  const enCeMoment = EVENEMENTS.slice(0, 4);

  return (
    <div className={s.racine}>
      <Header />
      <main className={s.cont}>
        <section className={s.hero}>
          <h1 className={s.h1}>
            Chope ta place, <em>vis la fête.</em>
          </h1>
          <p className={s.sous}>
            Concerts, festivals, soirées, culture — découvre tout ce qui se passe près de chez toi et réserve en quelques secondes. Paiement Mobile Money,
            billet QR instantané.
          </p>
          <div className={s.actions}>
            <a href="#programmation" className={`${s.btnBlanc} ${s.btnGrand}`}>
              Voir la programmation
            </a>
            <a href="/preview-design/v2/creer" className={`${s.btnSec} ${s.btnGrand}`}>
              Publier un événement <Icon name="arrow" />
            </a>
          </div>
          <ul className={s.garanties}>
            <li>
              <Icon name="phone" /> Mobile Money
            </li>
            <li>
              <Icon name="qr" /> Billet QR instantané
            </li>
            <li>
              <Icon name="shield" /> Entrée contrôlée
            </li>
          </ul>
        </section>

        <Reveal>
          <section className={s.section}>
            <div className={s.tete}>
              <h2 className={s.h2}>En ce moment</h2>
              <a href="/preview-design/v2/evenements">
                Tout voir <Icon name="chevron-right" />
              </a>
            </div>
            <ul className={s.pile}>
              {enCeMoment.map((e) => (
                <li key={e.slug}>
                  <a href={DETAIL} className={s.pileLien}>
                    <Affiche e={e} s={s} />
                    <div>
                      <h3 className={s.pileTitre}>{e.titre}</h3>
                      <p className={s.pileMeta}>
                        <b>{dateCourte(e)}</b>
                        <span>·</span>
                        <span>
                          {e.lieu}, {e.ville}
                        </span>
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>

        <Reveal delay={100}>
          <section className={s.section} id="programmation">
            <div className={s.tete}>
              <h2 className={s.h2}>Programmation</h2>
            </div>
            <Programme evenements={EVENEMENTS} s={s} href={DETAIL} etatInitial={etatDepuis(searchParams.etat)} />
          </section>
        </Reveal>

        <Reveal>
          <section className={s.section}>
            <div className={s.promo}>
              <div style={{ display: "grid", gap: 12 }}>
                <h2 className={s.h1}>Publie ton événement</h2>
                <p className={s.discret}>5 minutes pour créer, 8 % de commission uniquement sur les billets vendus.</p>
              </div>
              <a href="/preview-design/v2/creer" className={`${s.btnBlanc} ${s.btnGrand}`} style={{ justifySelf: "start" }}>
                Commencer <Icon name="arrow" />
              </a>
            </div>
          </section>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
