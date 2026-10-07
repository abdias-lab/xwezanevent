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
 */
export default function V2Artiste({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const nom = "Zeynab Habib";
  const verifie = etat !== "non-verifie";
  const photo = etat === "sans-photo" ? null : EVENEMENTS[4].image;
  const aVenir = etat === "sans-dates" ? [] : [EVENEMENTS[1], EVENEMENTS[3], EVENEMENTS[0]];
  const passees = etat === "sans-dates" ? [] : PASSEES;

  return (
    <div className={s.racine}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/preview-design/v2/evenements">Événements</a>
          <Icon name="chevron-right" />
          <span>{nom}</span>
        </nav>

        <section className={s.artTete}>
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
            <div className={s.artReseaux}>
              {RESEAUX.map((r) => (
                <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">
                  <Icon name="link" /> {r.libelle}
                </a>
              ))}
            </div>
          </div>
        </section>

        <p className={s.artBio}>
          Voix du Bénin moderne, Zeynab mêle afro-pop et chants fon hérités de sa grand-mère. Trois albums, des scènes de Cotonou à Paris, et une
          tournée 2026 qui passe par les grandes villes du pays.
          {"\n\n"}Son dernier single, « Gbè », a dépassé le million d&apos;écoutes sur Audiomack.
        </p>

        <section className={s.section} aria-labelledby="a-venir">
          <div className={s.tete}>
            <h2 id="a-venir" className={s.h2}>
              Prochaines dates
            </h2>
          </div>
          {aVenir.length === 0 ? (
            <div className={s.vide}>
              <Icon name="calendar" size={32} className={s.videIco} />
              <h3 className={s.videTitre}>Aucune date annoncée pour l&apos;instant</h3>
              <p className={s.videTexte}>Les prochains concerts de {nom} apparaîtront ici dès qu&apos;ils seront en vente.</p>
            </div>
          ) : (
            <div className={s.grille}>
              {aVenir.map((e) => (
                <Carte key={e.slug} e={e} s={s} href={DETAIL} />
              ))}
            </div>
          )}
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
        <RubanEtats chemin="/preview-design/v2/artiste" etats={["normal", "sans-dates", "sans-photo", "non-verifie", "connecte", "abonne"]} />
      </main>
      <Footer />
    </div>
  );
}
