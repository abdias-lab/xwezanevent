import Link from "next/link";
import s from "../../../espace.module.css";
import Icon from "../../../../Icon";
import { initialesArtiste } from "../../artistes/_artistes";

/**
 * Panneau « Artistes » de la fiche d'un événement (organisateur, design/
 * ARTISTES.md, lot 2) : état de chaque rattachement, pour que l'organisateur
 * sache si une proposition a été acceptée, refusée ou attend encore, au lieu
 * de relancer dans le vide. Preview : copie de components/v2/orga/ArtistesEvenement.tsx.
 */
export type ArtisteFiche = {
  id: string;
  nom: string;
  photo: string | null;
  statutArtiste: "en_validation" | "valide" | "refuse";
  gere: boolean;
  statut: "accepte" | "propose" | "refuse";
  /** Date lisible de la proposition, de l'accord ou du refus. */
  le: string | null;
};

const PASTILLE = {
  accepte: { libelle: "Confirmé", classe: s.stFort },
  propose: { libelle: "En attente", classe: s.stAttente },
  refuse: { libelle: "Refusé", classe: s.stDanger },
};

function etat(a: ArtisteFiche): string {
  if (a.statut === "propose") return `Proposé${a.le ? ` le ${a.le}` : ""} à son label ou à l'artiste. Il s'affichera après leur accord.`;
  if (a.statut === "refuse") return `Refusé${a.le ? ` le ${a.le}` : ""} par son label ou l'artiste : il n'apparaît pas.`;
  if (a.statutArtiste === "refuse") return "Page artiste refusée : il n'apparaît pas.";
  if (a.statutArtiste === "en_validation") return "Page en vérification : son nom s'affiche, sans lien.";
  return a.gere ? "Ton artiste" : `Accepté${a.le ? ` le ${a.le}` : ""} par son label ou l'artiste.`;
}

export default function ArtistesEvenement({ artistes, lienModifier }: { artistes: ArtisteFiche[]; lienModifier: string | null }) {
  return (
    <section className={s.panneau} aria-labelledby="artistes-titre">
      <h2 id="artistes-titre" className={s.panneauTitre}>
        Artistes
      </h2>
      {artistes.length === 0 ? (
        <p className={s.aide}>Aucun artiste à l&apos;affiche.</p>
      ) : (
        <ul className={s.artistesChoisis}>
          {artistes.map((a) => (
            <li key={a.id} className={s.artisteFiche}>
              <span className={`${s.avatarArtiste} ${s.avatarPetit}`} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.photo ? <img src={a.photo} alt="" /> : initialesArtiste(a.nom)}
              </span>
              <span className={s.artisteTexte}>
                <b>{a.nom}</b>
                <small>{etat(a)}</small>
              </span>
              <span className={`${s.statut} ${PASTILLE[a.statut].classe}`}>{PASTILLE[a.statut].libelle}</span>
            </li>
          ))}
        </ul>
      )}
      {lienModifier && (
        <Link href={lienModifier} className={`${s.btn} ${s.btnGris}`} style={{ marginTop: 16 }}>
          <Icon name="edit" size={16} /> {artistes.length ? "Modifier les artistes" : "Ajouter des artistes"}
        </Link>
      )}
    </section>
  );
}
