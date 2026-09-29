import Icon from "@/components/v2/Icon";
import Reveal from "@/components/v2/Reveal";
import { Header, Footer } from "@/components/v2/public/Chrome";
import { Affiche } from "@/components/v2/public/Carte";
import Programme, { type ElementProgramme } from "@/components/v2/public/Programme";
import { libelleGroupe, versCarte } from "@/components/v2/public/carteData";
import { dateCarte } from "@/components/v2/public/evenement";
import { POLICES_V2 } from "@/components/v2/polices";
import s from "@/components/v2/v2.module.css";
import { getEvenementsPublies, getSlugsMisEnAvant } from "@/lib/events";
import { getPaysActuel } from "@/lib/pays";

// Régénération incrémentale : la page est reconstruite au plus une fois par minute
export const revalidate = 60;

/** Nombre d'événements du bloc « En ce moment ». */
const EN_CE_MOMENT = 4;

/**
 * Accueil (V2), repris de la preview (v2/page.tsx). « En ce moment » : les
 * événements mis en avant par l'admin, dans l'ordre choisi, complétés par
 * les prochains jusqu'à 4. Puis toute la programmation à venir du pays,
 * filtrable par catégorie.
 */
export default async function Accueil() {
  const pays = await getPaysActuel();
  const [evenements, misEnAvant] = await Promise.all([getEvenementsPublies({ pays }), getSlugsMisEnAvant(pays)]);

  const parSlug = new Map(evenements.map((e) => [e.id, e]));
  const choisis = misEnAvant.map((slug) => parSlug.get(slug)).filter((e): e is NonNullable<typeof e> => !!e);
  const enCeMoment = [...choisis, ...evenements.filter((e) => !misEnAvant.includes(e.id))].slice(0, EN_CE_MOMENT);
  const elements: ElementProgramme[] = evenements.map((e) => ({ carte: versCarte(e), href: e.href, groupe: { cle: e.groupeDate.cle, libelle: libelleGroupe(e) } }));

  return (
    <div className={`${POLICES_V2} ${s.racine}`}>
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
            <a href="/creer" className={`${s.btnSec} ${s.btnGrand}`}>
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

        {enCeMoment.length > 0 && (
          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>En ce moment</h2>
                <a href="/evenements">
                  Tout voir <Icon name="chevron-right" />
                </a>
              </div>
              <ul className={s.pile}>
                {enCeMoment.map((e) => {
                  const carte = versCarte(e);
                  return (
                    <li key={e.id}>
                      <a href={e.href} className={s.pileLien}>
                        <Affiche e={carte} s={s} />
                        <div>
                          <h3 className={s.pileTitre}>{e.titre}</h3>
                          <p className={s.pileMeta}>
                            <b>{dateCarte(carte)}</b>
                            <span>·</span>
                            <span>
                              {e.nomLieu}, {e.ville}
                            </span>
                          </p>
                        </div>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        )}

        <Reveal delay={100}>
          <section className={s.section} id="programmation">
            <div className={s.tete}>
              <h2 className={s.h2}>Programmation</h2>
            </div>
            <Programme elements={elements} s={s} />
          </section>
        </Reveal>

        <Reveal>
          <section className={s.section}>
            <div className={s.promo}>
              <div style={{ display: "grid", gap: 12 }}>
                <h2 className={s.h1}>Publie ton événement</h2>
                <p className={s.discret}>5 minutes pour créer, 8 % de commission uniquement sur les billets vendus.</p>
              </div>
              <a href="/creer" className={`${s.btnBlanc} ${s.btnGrand}`} style={{ justifySelf: "start" }}>
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
