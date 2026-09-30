import Icon from "../Icon";
import { Affiche } from "./Carte";
import { dateCarte } from "./evenement";

type Styles = Record<string, string>;
export type EpingleCarte = { titre: string; accroche: string | null; categorie: string; image: string | null; debut: string; fin?: string; heure: string | null };

/**
 * Carte du bloc « Épinglé » de l'accueil (preview : preview-design/Epingle.tsx) :
 * affiche 16:9, titre discret (le nom n'est pas toujours lisible sur
 * l'affiche), accroche, puis date et heure.
 * Sans `href` (aperçu dans l'admin), la carte n'est pas un lien.
 */
export default function Epingle({ e, s, href }: { e: EpingleCarte; s: Styles; href?: string }) {
  const contenu = (
    <>
      <Affiche e={e} s={s} />
      <h3 className={s.epingleTitre}>{e.titre}</h3>
      {e.accroche && <p className={s.epingleAccroche}>{e.accroche}</p>}
      <p className={s.epingleQuand}>
        <Icon name="calendar" />
        <span>
          {dateCarte(e)}
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
