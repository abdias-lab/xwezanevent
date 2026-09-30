import s from "../v2.module.css";
import { Header, Footer } from "../chrome";
import Affiche from "../../Affiche";
import Galerie from "../../Galerie";
import BilletPicker from "../../BilletPicker";
import DetailSquelette from "../../DetailSquelette";
import Icon from "../../Icon";
import Reveal from "../../Reveal";
import { EVENEMENTS, EVENEMENT_DETAIL, dateLongue } from "../../_data";

export default function V2Detail({ searchParams }: { searchParams: { etat?: string; affiche?: string; images?: string } }) {
  const ev = searchParams.affiche === "non" ? { ...EVENEMENT_DETAIL, image: null } : EVENEMENT_DETAIL;

  return (
    <div className={s.racine}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/preview-design/v2">Événements</a>
          <Icon name="chevron-right" />
          <span>{ev.ville}</span>
        </nav>

        {searchParams.etat === "chargement" ? (
          <DetailSquelette s={s} />
        ) : (
          <div className={s.detailGrille}>
            <div>
              {searchParams.images === "plusieurs" ? (
                // Proposition : affiche + visuels secondaires (programme, lieu), comme le carrousel de la prod.
                <Galerie images={[ev.image, EVENEMENTS[1].image, EVENEMENTS[4].image, EVENEMENTS[6].image].filter((x): x is string => !!x)} titre={ev.titre} categorie={ev.categorie} s={s} />
              ) : (
                <Affiche e={ev} s={s} priorite />
              )}
              <h1 className={s.dTitre}>{ev.titre}</h1>
              <p className={s.dQuand}>
                <Icon name="calendar" size={20} />
                {dateLongue(ev)}
              </p>
              <div className={s.puces}>
                <span className={s.puce}>
                  <Icon name="pin" /> {ev.lieu}, {ev.ville}
                </span>
                <span className={s.puce}>
                  <Icon name="clock" /> Portes {ev.heure}
                </span>
                <span className={s.puce}>
                  <Icon name="phone" /> Mobile Money
                </span>
                <span className={s.puce}>
                  <Icon name="qr" /> Billet QR
                </span>
              </div>

              <Reveal>
                <section className={s.section} style={{ paddingTop: 48 }}>
                  <div className={s.tete}>
                    <h2 className={s.h2}>À propos</h2>
                  </div>
                  <p className={`${s.texte} ${s.texteLibre}`}>{ev.description}</p>
                  <div className={s.puces} style={{ marginTop: 16 }}>
                    {ev.tags.map((t) => (
                      <span key={t} className={s.tag}>
                        {t}
                      </span>
                    ))}
                  </div>
                </section>
              </Reveal>

              <Reveal>
                <section className={s.section} style={{ paddingTop: 48 }}>
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
                  <p className={s.discret} style={{ marginTop: 24 }}>
                    Organisé par {ev.organisateur} · {ev.lieuAdresse}
                  </p>
                </section>
              </Reveal>
            </div>

            <aside className={s.colAchat}>
              <section className={s.section} style={{ paddingTop: 32 }}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Billets</h2>
                </div>
                <BilletPicker tarifs={ev.tarifs} s={s} commande="/preview-design/v2/commande" />
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
