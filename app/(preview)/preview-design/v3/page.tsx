import s from "./v3.module.css";
import { Header, Footer, Ornement } from "./chrome";
import Carte from "../Carte";
import Icon from "../Icon";
import Programme from "../Programme";
import Reveal from "../Reveal";
import { CATEGORIES, EVENEMENTS, SLOGAN, etatDepuis } from "../_data";

const DETAIL = "/preview-design/v3/evenement";

export default function V3Accueil({ searchParams }: { searchParams: { etat?: string } }) {
  const selection = EVENEMENTS.slice(0, 3);
  const suite = EVENEMENTS.slice(3);

  return (
    <div className={s.racine}>
      <Header />
      <main>
        <section className={s.hero}>
          <div className={s.cont}>
            <p className={s.slogan}>{SLOGAN}</p>
            <h1 className={s.h1}>
              Les nuits du Bénin, <em>en un billet.</em>
            </h1>
            <p className={s.sous}>Concerts, festivals, soirées. Payez en Mobile Money, entrez avec votre QR code.</p>
            <form className={s.recherche} role="search">
              <label className={s.champ}>
                <Icon name="search" size={20} />
                <input type="search" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
              </label>
              <button type="button" className={`${s.btnPlein} ${s.btnGrand}`}>
                Chercher
              </button>
            </form>
          </div>
        </section>

        <div className={s.cont}>
          <Reveal>
            <section className={s.section} style={{ paddingTop: 48 }}>
              <div className={s.tete}>
                <h2 className={s.h2}>Sélection du moment</h2>
                <span className={s.label}>{selection.length} à ne pas manquer</span>
              </div>
              <div className={s.rail}>
                {selection.map((e) => (
                  <Carte key={e.slug} e={e} s={s} href={DETAIL} />
                ))}
              </div>
            </section>
          </Reveal>

          <Ornement />

          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>Toute la programmation</h2>
              </div>
              <Programme evenements={suite} categories={CATEGORIES} s={s} href={DETAIL} etatInitial={etatDepuis(searchParams.etat)} />
            </section>
          </Reveal>

          <Ornement />

          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>Trois gestes, une soirée</h2>
              </div>
              <ol className={s.etapes}>
                <li>
                  <span className={s.etapeIco}>
                    <Icon name="ticket" size={24} />
                  </span>
                  <div>
                    <strong>Choisissez votre billet</strong>
                    <span className={s.discret}>Standard, VIP ou table : les tarifs sont clairs en FCFA.</span>
                  </div>
                </li>
                <li>
                  <span className={s.etapeIco}>
                    <Icon name="phone" size={24} />
                  </span>
                  <div>
                    <strong>Payez en Mobile Money</strong>
                    <span className={s.discret}>MTN, Moov ou Celtiis, depuis votre téléphone.</span>
                  </div>
                </li>
                <li>
                  <span className={s.etapeIco}>
                    <Icon name="qr" size={24} />
                  </span>
                  <div>
                    <strong>Entrez avec votre QR</strong>
                    <span className={s.discret}>Reçu par e-mail, contrôlé à l&apos;entrée.</span>
                  </div>
                </li>
              </ol>
            </section>
          </Reveal>

          <Reveal>
            <section className={s.section}>
              <div className={s.orga}>
                <div style={{ display: "grid", gap: 12 }}>
                  <h2 className={s.h1}>Vous organisez ? Nous vendons.</h2>
                  <p className={s.discret}>Publiez en 5 minutes. 8 % de commission, uniquement sur les billets vendus.</p>
                </div>
                <a href="#" className={`${s.btnPlein} ${s.btnGrand}`} style={{ justifySelf: "start" }}>
                  Publier un événement <Icon name="arrow" />
                </a>
              </div>
            </section>
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
}
