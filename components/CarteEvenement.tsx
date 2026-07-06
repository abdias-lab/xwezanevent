import Image from "next/image";
import Link from "next/link";

export interface CarteEvenementProps {
  id: string;
  titre: string;
  categorie: string;
  lieu: string;
  /** Prix « à partir de » en FCFA */
  prix: number;
  /** Libellé affiché sous le prix (ex. « à partir de », « couple », « inscription ») */
  prixLegende?: string;
  jour: string;
  mois: string;
  image: string;
  href?: string;
}

/**
 * Carte-billet : visuel + souche de date dorée + déchirure perforée.
 * Reproduit fidèlement `.carte` de la maquette.
 */
export default function CarteEvenement({
  id,
  titre,
  categorie,
  lieu,
  prix,
  prixLegende = "à partir de",
  jour,
  mois,
  image,
  href,
}: CarteEvenementProps) {
  const lien = href ?? `/evenement/${id}`;

  return (
    <article className="carte">
      <Link href={lien} aria-label={`${titre} — voir l'événement`}>
        <div className="visuel">
          <Image
            className="photo"
            src={image}
            alt={titre}
            fill
            sizes="(max-width: 680px) 100vw, (max-width: 1020px) 50vw, 33vw"
          />
          <span className="voile" aria-hidden="true" />
          <span className="badge-cat">{categorie}</span>
          <div className="date-souche">
            <span className="jour">{jour}</span>
            <span className="mois">{mois}</span>
          </div>
        </div>

        <div className="dechirure" />

        <div className="infos">
          <h3>{titre}</h3>
          <p className="lieu">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {lieu}
          </p>

          <div className="pied-carte">
            <span className="prix">
              {prix.toLocaleString("fr-FR")} FCFA
              <small>{prixLegende}</small>
            </span>
            <span className="mini-btn">Réserver</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
