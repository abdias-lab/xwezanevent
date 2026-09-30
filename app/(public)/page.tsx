import Icon from "@/components/v2/Icon";
import Reveal from "@/components/v2/Reveal";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Epingle from "@/components/v2/public/Epingle";
import Programme, { type ElementProgramme } from "@/components/v2/public/Programme";
import { libelleGroupe, versCarte } from "@/components/v2/public/carteData";
import { POLICES_V2 } from "@/components/v2/polices";
import s from "@/components/v2/v2.module.css";
import { getEvenementsEpingles, getEvenementsPublies } from "@/lib/events";
import { getPaysActuel } from "@/lib/pays";

// Régénération incrémentale : la page est reconstruite au plus une fois par minute
export const revalidate = 60;

/** Programmation de l'accueil : au-delà, « Voir plus » mène au catalogue. */
const LIMITE_PROGRAMME = 10;

/**
 * Accueil (V2), repris de la preview (v2/page.tsx). « Épinglé » : uniquement
 * les événements cochés « à la une » par l'admin, dans l'ordre choisi ; bloc
 * absent si aucun. Puis la programmation à venir du pays, filtrable par
 * catégorie, limitée à LIMITE_PROGRAMME événements.
 */
export default async function Accueil() {
  const pays = await getPaysActuel();
  const [evenements, epingles] = await Promise.all([getEvenementsPublies({ pays }), getEvenementsEpingles(pays)]);
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

        {epingles.length > 0 && (
          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>Épinglé</h2>
              </div>
              <div className={s.epingles}>
                {epingles.map((e) => (
                  <Epingle
                    key={e.id}
                    e={{ titre: e.titre, accroche: e.accroche, categorie: e.categorie, image: e.image, debut: e.dateDebut, fin: e.dateFin ?? undefined, heure: e.heure }}
                    s={s}
                    href={e.href}
                  />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <Reveal delay={100}>
          <section className={s.section} id="programmation">
            <div className={s.tete}>
              <h2 className={s.h2}>Programmation</h2>
            </div>
            <Programme elements={elements} s={s} limite={LIMITE_PROGRAMME} catalogue="/evenements" />
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
