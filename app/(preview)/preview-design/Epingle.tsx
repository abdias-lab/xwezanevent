import Affiche from "./Affiche";
import Icon from "./Icon";
import { dateCourte, type Evenement } from "./_data";

type Styles = Record<string, string>;

/**
 * Carte du bloc « Épinglé » de l'accueil : affiche 16:9, titre discret (le
 * nom n'est pas toujours lisible sur l'affiche), accroche, puis date et heure. Sans `href` (aperçu dans l'admin),
 * la carte n'est pas un lien.
 */
export default function Epingle({ e, accroche, s, href }: { e: Evenement; accroche: string | null; s: Styles; href?: string }) {
  const contenu = (
    <>
      <Affiche e={e} s={s} />
      <h3 className={s.epingleTitre}>{e.titre}</h3>
      {accroche && <p className={s.epingleAccroche}>{accroche}</p>}
      <p className={s.epingleQuand}>
        <Icon name="calendar" />
        <span>
          {dateCourte(e)}
          {e.heure && ` · ${e.heure}`}
        </span>
      </p>
    </>
  );
  return href ? (
    <a href={href} className={s.epingle}>
      {contenu}
    </a>
  ) : (
    <div className={s.epingle}>{contenu}</div>
  );
}
