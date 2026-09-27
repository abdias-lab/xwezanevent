import Affiche from "./Affiche";
import Icon from "./Icon";
import { dateCourte, jour, mois, prixDes, type Evenement } from "./_data";

type Styles = Record<string, string>;

/**
 * Carte événement : DOM unique partagé, chaque version le met en forme via son CSS.
 * Titre en premier niveau de lecture, date/lieu en second, prix et tags en dernier.
 */
export default function Carte({ e, s, href, maxTags = 3 }: { e: Evenement; s: Styles; href: string; maxTags?: number }) {
  const tags = e.tags.slice(0, maxTags);
  const reste = e.tags.length - tags.length;
  return (
    <a href={href} className={s.carte}>
      <div className={s.visuel}>
        <Affiche e={e} s={s} />
        <div className={s.souche} aria-hidden="true">
          <span className={s.sJour}>{jour(e.debut)}</span>
          <span className={s.sMois}>{mois(e.debut)}</span>
        </div>
        {e.restantes ? <span className={s.alerte}>Plus que {e.restantes}</span> : null}
      </div>
      <div className={s.corps}>
        <h3 className={s.titre}>{e.titre}</h3>
        <p className={`${s.ligne} ${s.quand}`}>
          <Icon name="calendar" className={s.ligneIco} />
          <span>
            {dateCourte(e)} · {e.heure}
          </span>
        </p>
        <p className={s.ligne}>
          <Icon name="pin" className={s.ligneIco} />
          <span>
            {e.lieu}, {e.ville}
          </span>
        </p>
        <div className={s.bas}>
          <span className={s.prix}>{prixDes(e)}</span>
          <span className={s.tags}>
            {tags.map((t) => (
              <span key={t} className={s.tag}>
                {t}
              </span>
            ))}
            {reste > 0 && <span className={s.tag}>+{reste}</span>}
          </span>
        </div>
      </div>
    </a>
  );
}

export function CarteSquelette({ s }: { s: Styles }) {
  return (
    <div className={s.skel} aria-hidden="true">
      <div className={s.skelImg} />
      <div className={s.skelCorps}>
        <div className={s.skelL1} />
        <div className={s.skelL2} />
        <div className={s.skelL3} />
      </div>
    </div>
  );
}
