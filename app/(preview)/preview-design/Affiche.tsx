import Icon from "./Icon";
import { initiales, type Evenement } from "./_data";

type Styles = Record<string, string>;

/**
 * Affiche : ratio imposé par le CSS du cadre (aspect-ratio) + object-fit: cover,
 * quel que soit le format uploadé. Sans image : repli typographique (initiales,
 * catégorie). Le titre n'est jamais dessiné ici, il reste lisible hors de l'image.
 */
export default function Affiche({ e, s, priorite = false }: { e: Pick<Evenement, "titre" | "image" | "categorie">; s: Styles; priorite?: boolean }) {
  return (
    <div className={s.cadre}>
      {e.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={s.img}
          src={e.image}
          alt={`Affiche : ${e.titre}`}
          width={640}
          height={360}
          loading={priorite ? "eager" : "lazy"}
          decoding="async"
        />
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
