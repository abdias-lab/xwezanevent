import s from "./v1.module.css";
import { Header, Footer } from "./chrome";
import Affiche from "../Affiche";
import Icon from "../Icon";
import Programme from "../Programme";
import Reveal from "../Reveal";
import { CATEGORIES, EVENEMENTS, dateLongue, etatDepuis, prixDes } from "../_data";

const DETAIL = "/preview-design/v1/evenement";

export default function V1Accueil({ searchParams }: { searchParams: { etat?: string } }) {
  const vedette = EVENEMENTS[0];
  const reste = EVENEMENTS.slice(1);

  return (
    <div className={s.racine}>
      <Header />
      <main>
        <section className={s.hero}>
          <div className={s.cont}>
            <p className={s.label}>Billetterie · Bénin</p>
            <h1 className={s.h1}>
              Vos sorties au Bénin, <em>en un billet.</em>
            </h1>
            <p className={s.sous}>Concerts, festivals, soirées. Payez en Mobile Money et recevez votre billet QR en quelques secondes.</p>
            <form className={s.recherche} role="search">
              <label className={s.champ}>
                <Icon name="search" size={20} />
                <input type="search" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
              </label>
              <button type="button" className={`${s.btnPlein} ${s.btnGrand}`}>
                Chercher
              </button>
            </form>
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
          </div>
        </section>

        <div className={s.cont}>
          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>À la une</h2>
                <span className={s.label}>{dateLongue(vedette)}</span>
              </div>
              <a href={DETAIL} className={s.vedette}>
                <div className={s.visuel}>
                  <Affiche e={vedette} s={s} priorite />
                </div>
                <div className={s.vCorps}>
                  <h3 className={s.vTitre}>{vedette.titre}</h3>
                  <p className={`${s.ligne} ${s.quand}`}>
                    <Icon name="calendar" className={s.ligneIco} size={20} />
                    <span>
                      {dateLongue(vedette)} · {vedette.heure}
                    </span>
                  </p>
                  <p className={s.ligne}>
                    <Icon name="pin" className={s.ligneIco} size={20} />
                    <span>
                      {vedette.lieu}, {vedette.ville}
                    </span>
                  </p>
                  <span className={`${s.btnPlein} ${s.btnGrand}`} style={{ justifySelf: "start", marginTop: 8 }}>
                    {prixDes(vedette)}
                    <Icon name="arrow" />
                  </span>
                </div>
              </a>
            </section>
          </Reveal>

          <Reveal delay={100}>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>Programmation</h2>
              </div>
              <Programme evenements={reste} categories={CATEGORIES} s={s} href={DETAIL} etatInitial={etatDepuis(searchParams.etat)} />
            </section>
          </Reveal>

          <Reveal>
            <section className={s.section}>
              <ul className={s.valeurs}>
                <li>
                  <Icon name="phone" size={24} />
                  <div>
                    <strong>Payez comme vous en avez l&apos;habitude</strong>
                    <span className={s.discret}>MTN, Moov ou Celtiis, depuis votre téléphone. Pas de carte bancaire.</span>
                  </div>
                </li>
                <li>
                  <Icon name="qr" size={24} />
                  <div>
                    <strong>Un billet dans votre poche</strong>
                    <span className={s.discret}>Reçu par e-mail dès la confirmation, valable hors connexion.</span>
                  </div>
                </li>
                <li>
                  <Icon name="shield" size={24} />
                  <div>
                    <strong>Un QR code, un seul passage</strong>
                    <span className={s.discret}>Chaque billet est vérifié à l&apos;entrée, impossible à dupliquer.</span>
                  </div>
                </li>
              </ul>
            </section>
          </Reveal>

          <Reveal>
            <section className={s.section}>
              <div className={s.orga}>
                <div style={{ display: "grid", gap: 12 }}>
                  <h2 className={s.h1}>Organisez, on vend.</h2>
                  <p className={s.discret}>Publiez votre événement en 5 minutes. 8 % de commission, uniquement sur les billets vendus.</p>
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
