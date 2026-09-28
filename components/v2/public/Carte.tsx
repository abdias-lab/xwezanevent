import Icon from "../Icon";
import { dateCarte, initiales, jour, mois, prixDes, type EvenementCarte } from "./evenement";

type Styles = Record<string, string>;

/**
 * Affiche (preview : _preview/Affiche.tsx) : ratio imposé par le CSS du cadre
 * + object-fit: cover. Sans image : repli typographique (initiales, catégorie).
 */
export function Affiche({ e, s, priorite = false }: { e: Pick<EvenementCarte, "titre" | "image" | "categorie">; s: Styles; priorite?: boolean }) {
  return (
    <div className={s.cadre}>
      {e.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.img} src={e.image} alt={`Affiche : ${e.titre}`} width={640} height={360} loading={priorite ? "eager" : "lazy"} decoding="async" />
      ) : (
        <div className={s.repli} role="img" aria-label={`${e.titre} : pas d'affiche`}>
          <Icon name="image" size={20} className={s.repliIcone} />
          <span className={s.repliMot}>{initiales(e.titre)}</span>
          <span className={s.repliCat}>{e.categorie}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Carte événement V2 (preview : _preview/Carte.tsx), mise en forme par le CSS
 * passé en `s` (components/v2/v2.module.css). Titre en premier niveau de
 * lecture, date/lieu en second, prix et tags en dernier.
 */
export default function Carte({ e, s, href, maxTags = 3 }: { e: EvenementCarte; s: Styles; href: string; maxTags?: number }) {
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
            {dateCarte(e)} · {e.heure}
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
