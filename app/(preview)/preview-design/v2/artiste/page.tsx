import type { Metadata } from "next";
import s from "../v2.module.css";
import { Header, Footer } from "../chrome";
import Carte from "../../Carte";
import Icon from "../../Icon";
import { RubanEtats } from "../Coquille";
import { EVENEMENTS, jour, mois } from "../../_data";
import { initialesArtiste } from "../orga/artistes/_artistes";
import AbonnementArtiste from "./AbonnementArtiste";

export const metadata: Metadata = { title: "Zeynab Habib — XwézanEvent" };

const DETAIL = "/preview-design/v2/evenement";
const RESEAUX = [
  { libelle: "Instagram", url: "https://instagram.com/zeynab" },
  { libelle: "YouTube", url: "https://youtube.com/@zeynab" },
  { libelle: "Spotify", url: "https://open.spotify.com/artist/zeynab" },
  { libelle: "Audiomack", url: "https://audiomack.com/zeynab" },
];
const PASSEES = [
  { date: "2026-08-15", titre: "Zeynab en acoustique", lieu: "Institut français", ville: "Cotonou" },
  { date: "2026-06-21", titre: "Fête de la musique : scène afro-pop", lieu: "Place de l'Étoile rouge", ville: "Cotonou" },
];

/**
 * Page artiste (preview V2, design/ARTISTES.md). En prod :
 * app/(public)/artiste/[slug] (404 tant que l'artiste n'est pas validé).
 * Badge « Vérifié » quand le compte qui gère l'artiste est vérifié ; label
 * relié au compte organisateur du label. « S'abonner » (lot 3) : visiteur
 * non connecté par défaut. États : ?etat=sans-dates, sans-photo,
 * non-verifie, connecte (connecté, pas abonné), abonne.
 *
 * Refonte de la page (2026-10-09, en preview seulement) : bandeau avec la
 * photo floutée en fond (repli : dégradé anthracite → or), dates avant la bio,
 * conteneur resserré (960 px), état vide réduit à une ligne. Photo de
 * démonstration : public/images/artiste-demo.jpg (Unsplash).
 */
export default function V2Artiste({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const nom = "Zeynab Habib";
  const verifie = etat !== "non-verifie";
  // Photo de démonstration libre de droits (Unsplash, Keagan Henman, licence Unsplash) ;
  // photo-blanche : pire cas du contraste (image entièrement blanche).
  const photo = etat === "sans-photo" ? null : etat === "photo-blanche" ? "/images/preview-blanc.png" : "/images/artiste-demo.jpg";
  const aVenir = etat === "sans-dates" ? [] : [EVENEMENTS[1], EVENEMENTS[3], EVENEMENTS[0]];
  const passees = etat === "sans-dates" ? [] : PASSEES;
  const reseaux = RESEAUX.map((r) => (
    <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">
      <Icon name="link" /> {r.libelle}
    </a>
  ));

  return (
    <div className={s.racine}>
      <Header />
      <main>
        <div className={`${s.cont} ${s.artCont} ${s.artFil}`}>
          <nav className={s.fil} aria-label="Fil d'Ariane">
            <a href="/preview-design/v2/evenements">Événements</a>
            <Icon name="chevron-right" />
            <span>{nom}</span>
          </nav>
        </div>
        {/* Bandeau : photo de profil peu floutée en fond (WebP, largeur fixe), voile local sous le texte.
            Sans photo : dégradé anthracite → or. */}
        <section className={`${s.artBandeau} ${photo ? "" : s.artBandeauRepli}`}>
          {photo && (
            <div className={s.artFond} aria-hidden="true">
              {/* Largeur fixe quelle que soit la densité de l'écran : 640 px en mobile, 1 200 en bureau (fond peu flouté). */}
              <picture>
                <source media="(min-width: 768px)" srcSet={`/_next/image?url=${encodeURIComponent(photo)}&w=1200&q=60`} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/_next/image?url=${encodeURIComponent(photo)}&w=640&q=60`} alt="" fetchPriority="high" />
              </picture>
            </div>
          )}
          <div className={`${s.cont} ${s.artCont}`}>
            <div className={s.artTete}>
              <div className={s.artPhoto}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={`Photo : ${nom}`} />
                ) : (
                  <span aria-hidden="true">{initialesArtiste(nom)}</span>
                )}
              </div>
              <div className={s.artInfos}>
                <h1 className={s.h1}>
                  {nom}
                  {verifie && (
                    <span className={s.badgeVerifie}>
                      <Icon name="check" /> Vérifié
                    </span>
                  )}
                </h1>
                <AbonnementArtiste
                  artisteId="a1"
                  slug="zeynab-habib"
                  nom={nom}
                  nomLabel="Ouidah Live"
                  abonnesInitial={etat === "abonne" ? 1249 : 1248}
                  initial={{ connecte: etat === "connecte" || etat === "abonne", abonne: etat === "abonne" }}
                />
                {/* Bureau seulement ; en mobile, sous la bio (bandeau moins haut à 360 px). */}
                <div className={`${s.artReseaux} ${s.artReseauxBureau}`}>{reseaux}</div>
              </div>
            </div>
          </div>
        </section>

        <div className={`${s.cont} ${s.artCont}`}>
        <section className={s.artSection} aria-labelledby="a-venir">
          <div className={s.tete}>
            <h2 id="a-venir" className={s.h2}>
              Prochaines dates
            </h2>
          </div>
          {aVenir.length === 0 ? (
            <p className={s.artVide}>
              <Icon name="calendar" size={16} /> Aucune date annoncée pour l&apos;instant.
            </p>
          ) : (
            <div className={s.grille}>
              {aVenir.map((e) => (
                <Carte key={e.slug} e={e} s={s} href={DETAIL} />
              ))}
            </div>
          )}
        </section>

        <section className={s.section} aria-labelledby="bio">
          <div className={s.tete}>
            <h2 id="bio" className={s.h2}>
              À propos
            </h2>
          </div>
          <p className={s.artBio}>
            Voix du Bénin moderne, Zeynab mêle afro-pop et chants fon hérités de sa grand-mère. Trois albums, des scènes de Cotonou à Paris, et une
            tournée 2026 qui passe par les grandes villes du pays.
            {"\n\n"}Son dernier single, « Gbè », a dépassé le million d&apos;écoutes sur Audiomack.
          </p>
          <div className={`${s.artReseaux} ${s.artReseauxMobile}`}>{reseaux}</div>
        </section>

        {passees.length > 0 && (
          <section className={s.section} aria-labelledby="passees">
            <div className={s.tete}>
              <h2 id="passees" className={s.h2}>
                Dates passées
              </h2>
            </div>
            <ul className={s.artPassees}>
              {passees.map((p) => (
                <li key={p.date}>
                  <span className={s.artPasseeDate}>
                    {Number(jour(p.date))} {mois(p.date)} {p.date.slice(0, 4)}
                  </span>
                  <span className={s.artPasseeTitre}>{p.titre}</span>
                  <span className={s.artPasseeLieu}>
                    {p.lieu}, {p.ville}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <RubanEtats chemin="/preview-design/v2/artiste" etats={["normal", "sans-dates", "sans-photo", "non-verifie", "connecte", "abonne", "photo-blanche"]} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
