import Header from "@/components/Header";
import CarteEvenement from "@/components/CarteEvenement";
import BoutonOr from "@/components/BoutonOr";
import FiltreQuand from "@/components/FiltreQuand";
import FiltreVille from "@/components/FiltreVille";
import { getEvenementsPublies, getCategoriesPubliees } from "@/lib/events";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Événements — XwézanEvent",
  description: "Tous les événements publiés : concerts, festivals, soirées, culture, sport au Bénin.",
};

// Emoji d'accompagnement des puces de catégorie (facultatif, best-effort)
const EMOJI_CATEGORIE: Record<string, string> = {
  Concert: "🎵",
  Concerts: "🎵",
  Festival: "🎪",
  Festivals: "🎪",
  "Culture & Vodun": "🪘",
  Culture: "🪘",
  Sport: "⚽",
  Humour: "😂",
  Soirée: "🌙",
  Soirées: "🌙",
};

const LABEL_QUAND: Record<string, string> = {
  aujourdhui: "aujourd'hui",
  "week-end": "ce week-end",
  semaine: "cette semaine",
  mois: "ce mois-ci",
};

type ParamsRecherche = { categorie?: string; quand?: string; q?: string; ville?: string };

function hrefEvenements(actifs: ParamsRecherche, overrides: ParamsRecherche): string {
  const merged = { ...actifs, ...overrides };
  const params = new URLSearchParams();
  if (merged.categorie) params.set("categorie", merged.categorie);
  if (merged.quand) params.set("quand", merged.quand);
  if (merged.q) params.set("q", merged.q);
  if (merged.ville) params.set("ville", merged.ville);
  const qs = params.toString();
  return qs ? `/evenements?${qs}` : "/evenements";
}

function titreContextuel({ categorie, quand, q, ville }: ParamsRecherche): string {
  if (q) return `Résultats pour « ${q} »`;
  if (categorie && ville) return `${categorie} à ${ville}`;
  if (ville) return `Événements à ${ville}`;
  if (categorie) return `Événements : ${categorie}`;
  if (quand) return `Événements ${LABEL_QUAND[quand] ?? quand}`;
  return "Tous les événements";
}

export default async function Evenements({
  searchParams,
}: {
  searchParams: { categorie?: string; quand?: string; q?: string; ville?: string };
}) {
  const categorieActive = searchParams.categorie;
  const quandActif = searchParams.quand;
  const q = searchParams.q?.trim() || undefined;
  const ville = searchParams.ville?.trim() || undefined;
  const actifs: ParamsRecherche = { categorie: categorieActive, quand: quandActif, q, ville };
  const [evenements, categories] = await Promise.all([
    getEvenementsPublies({ categorie: categorieActive, quand: quandActif, q, ville }),
    getCategoriesPubliees(),
  ]);

  const nb = evenements.length;
  const filtresActifs = Boolean(categorieActive || quandActif || q || ville);

  const puces: { label: string; href: string }[] = [];
  if (q) puces.push({ label: `« ${q} »`, href: hrefEvenements(actifs, { q: undefined }) });
  if (ville) puces.push({ label: ville, href: hrefEvenements(actifs, { ville: undefined }) });
  if (categorieActive) puces.push({ label: categorieActive, href: hrefEvenements(actifs, { categorie: undefined }) });
  if (quandActif) puces.push({ label: LABEL_QUAND[quandActif] ?? quandActif, href: hrefEvenements(actifs, { quand: undefined }) });

  return (
    <>
      <Header />

      <main className="corps">
        {/* ------------------------------- FILTRES ------------------------------- */}
        <aside className="filtres" aria-label="Filtres">
          <div className="bloc-filtre">
            <h3>Catégorie</h3>
            <div className="puces">
              <Link
                href={hrefEvenements(actifs, { categorie: undefined })}
                className={`puce${!categorieActive ? " active" : ""}`}
              >
                Tous
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={hrefEvenements(actifs, { categorie: cat })}
                  className={`puce${categorieActive === cat ? " active" : ""}`}
                >
                  {EMOJI_CATEGORIE[cat] ? `${EMOJI_CATEGORIE[cat]} ` : ""}
                  {cat}
                </Link>
              ))}
            </div>
          </div>

          <FiltreQuand quandActif={quandActif} />

          <FiltreVille villeActive={ville} />

          <div className="bloc-filtre">
            <h3>Prix (FCFA)</h3>
            <input
              className="curseur"
              type="range"
              min={0}
              max={50000}
              defaultValue={50000}
              aria-label="Prix maximum"
            />
            <div className="bornes">
              <span>0</span>
              <span>50 000+</span>
            </div>
          </div>
        </aside>

        {/* ------------------------------ RÉSULTATS ------------------------------ */}
        <div>
          <h1 className="titre-resultats">{titreContextuel(actifs)}</h1>

          {puces.length > 0 && (
            <div className="puces puces-actives" aria-label="Filtres actifs">
              {puces.map((p) => (
                <Link key={p.label} href={p.href} className="puce active">
                  {p.label} <span aria-hidden="true">×</span>
                </Link>
              ))}
              <Link href="/evenements" className="puce puce-reset">
                Tout effacer
              </Link>
            </div>
          )}

          <div className="entete-resultats">
            <p className="nb">
              <b>{nb}</b> {nb > 1 ? "événements trouvés" : "événement trouvé"}
            </p>
            <div className="tri">
              <span>Trier :</span>
              <select aria-label="Trier les résultats" defaultValue="Date (proche)">
                <option>Date (proche)</option>
                <option>Prix croissant</option>
                <option>Prix décroissant</option>
                <option>Popularité</option>
              </select>
            </div>
          </div>

          {nb > 0 ? (
            <div className="grille-listing">
              {evenements.map((ev) => (
                <CarteEvenement key={ev.id} {...ev} />
              ))}
            </div>
          ) : (
            <div className="etat-vide">
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <h3>
                {q
                  ? `Aucun événement trouvé pour « ${q} »`
                  : "Aucun événement ne correspond"}
              </h3>
              <p>
                {filtresActifs
                  ? "Essaie de retirer un ou plusieurs filtres pour élargir ta recherche."
                  : "Aucun événement publié pour l'instant. Revenez très bientôt !"}
              </p>
              {filtresActifs ? (
                <BoutonOr href="/evenements">Réinitialiser les filtres</BoutonOr>
              ) : (
                <BoutonOr href="/creer">Publier un événement</BoutonOr>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="footer-mini">
        <div className="in">
          <span>© 2026 XwézanEvent — Cotonou, Bénin</span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
