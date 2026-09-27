import s from "../v1.module.css";
import { Header, Footer } from "../chrome";
import Affiche from "../../Affiche";
import BilletPicker from "../../BilletPicker";
import DetailSquelette from "../../DetailSquelette";
import Icon from "../../Icon";
import Reveal from "../../Reveal";
import { EVENEMENT_DETAIL, dateLongue } from "../../_data";

export default function V1Detail({ searchParams }: { searchParams: { etat?: string; affiche?: string } }) {
  const ev = searchParams.affiche === "non" ? { ...EVENEMENT_DETAIL, image: null } : EVENEMENT_DETAIL;

  return (
    <div className={s.racine}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/preview-design/v1">Événements</a>
          <Icon name="chevron-right" />
          <span>{ev.ville}</span>
        </nav>

        {searchParams.etat === "chargement" ? (
          <DetailSquelette s={s} />
        ) : (
          <div className={s.detailGrille}>
            <div>
              <Affiche e={ev} s={s} priorite />
              <h1 className={s.dTitre}>{ev.titre}</h1>
              <div className={s.dTags}>
                <span className={s.tag} style={{ color: "var(--or)", borderColor: "var(--or)" }}>
                  {ev.categorie}
                </span>
                {ev.tags.map((t) => (
                  <span key={t} className={s.tag}>
                    {t}
                  </span>
                ))}
              </div>

              <div className={s.faits}>
                <div className={s.fait}>
                  <Icon name="calendar" size={24} />
                  <div>
                    <strong className={s.quand}>{dateLongue(ev)}</strong>
                    <span className={s.discret}>Concerts dès 19 h</span>
                  </div>
                </div>
                <div className={s.fait}>
                  <Icon name="clock" size={24} />
                  <div>
                    <strong>Ouverture des portes à {ev.heure}</strong>
                    <span className={s.discret}>Arrivez tôt : contrôle des QR codes à l&apos;entrée</span>
                  </div>
                </div>
                <div className={s.fait}>
                  <Icon name="pin" size={24} />
                  <div>
                    <strong>
                      {ev.lieu}, {ev.ville}
                    </strong>
                    <span className={s.discret}>{ev.lieuAdresse}</span>
                  </div>
                </div>
                <div className={s.fait}>
                  <Icon name="phone" size={24} />
                  <div>
                    <strong>Paiement Mobile Money</strong>
                    <span className={s.discret}>MTN, Moov, Celtiis. Billet QR envoyé par e-mail.</span>
                  </div>
                </div>
              </div>

              <Reveal>
                <section className={s.section}>
                  <div className={s.tete}>
                    <h2 className={s.h2}>À propos</h2>
                  </div>
                  <p className={s.texte}>{ev.description}</p>
                </section>
              </Reveal>

              <Reveal>
                <section className={s.section}>
                  <div className={s.tete}>
                    <h2 className={s.h2}>Programme</h2>
                  </div>
                  <ol className={s.programme}>
                    {ev.programme.map((p) => (
                      <li key={p.jour}>
                        <span className={s.progJour}>{p.jour}</span>
                        <span>
                          {p.titre}
                          <span className={s.discret} style={{ display: "block" }}>
                            {p.heure}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              </Reveal>

              <div className={s.organisateur}>
                <span className={s.avatar}>OL</span>
                <div>
                  <div style={{ fontWeight: 700 }}>{ev.organisateur}</div>
                  <div className={s.discret}>Organisateur vérifié</div>
                </div>
              </div>
            </div>

            <aside className={s.colAchat}>
              <section className={s.section} style={{ paddingTop: 32 }}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Billets</h2>
                </div>
                <BilletPicker tarifs={ev.tarifs} s={s} />
              </section>
            </aside>
          </div>
        )}
        <div className={s.espaceBarre} />
      </main>
      <Footer />
    </div>
  );
}
