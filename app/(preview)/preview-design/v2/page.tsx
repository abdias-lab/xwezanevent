import s from "./v2.module.css";
import { Header, Footer } from "./chrome";
import Epingle from "../Epingle";
import Icon from "../Icon";
import Programme from "../Programme";
import Reveal from "../Reveal";
import { RubanEtats } from "./Coquille";
import { EVENEMENTS, etatDepuis, type Evenement } from "../_data";

const DETAIL = "/preview-design/v2/evenement";
/** Programmation de l'accueil : au-delà, « Voir plus » mène au catalogue. */
const LIMITE_PROGRAMME = 10;

/**
 * Épinglés : événements cochés « à la une » dans l'admin, avec leur accroche
 * (null : repli sur le début de la description). Pire cas inclus : accroche
 * de 200 caractères, la limite de saisie.
 */
const EPINGLES: { e: Evenement; accroche: string | null }[] = [
  {
    e: EVENEMENTS[1],
    accroche:
      "La nuit la plus attendue de la rentrée : trois scènes, douze artistes zinli et afrobeat, et le Palais des Congrès ouvert jusqu'à l'aube. Arrive tôt, les premières places partent toujours vite ce soir-là.",
  },
  { e: EVENEMENTS[0], accroche: "Trois jours de jazz les pieds dans le sable, face à l'océan." },
];

/** État « plein » : assez d'événements pour dépasser la limite de la programmation. */
const enDecembre = (d: string) => `${d.slice(0, 5)}12${d.slice(7)}`;
const PLEIN: Evenement[] = [
  ...EVENEMENTS,
  ...EVENEMENTS.map((e) => ({ ...e, slug: `${e.slug}-bis`, debut: enDecembre(e.debut), fin: e.fin && enDecembre(e.fin) })),
];

export default function V2Accueil({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const epingles = etat === "sans-epingle" ? [] : etat === "un-epingle" ? EPINGLES.slice(0, 1) : EPINGLES;

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

        {epingles.length > 0 && (
          <Reveal>
            <section className={s.section}>
              <div className={s.tete}>
                <h2 className={s.h2}>Épinglé</h2>
              </div>
              <div className={s.epingles}>
                {epingles.map(({ e, accroche }) => (
                  <Epingle key={e.slug} e={e} accroche={accroche} s={s} href={DETAIL} />
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
            <Programme
              evenements={etat === "plein" ? PLEIN : EVENEMENTS}
              s={s}
              href={DETAIL}
              etatInitial={etatDepuis(etat)}
              limite={LIMITE_PROGRAMME}
              catalogue="/preview-design/v2/evenements"
            />
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
        <RubanEtats chemin="/preview-design/v2" etats={["normal", "un-epingle", "sans-epingle", "plein", "vide", "chargement"]} />
      </main>
      <Footer />
    </div>
  );
}
