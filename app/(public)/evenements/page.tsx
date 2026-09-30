import type { Metadata } from "next";
import Icon from "@/components/v2/Icon";
import Carte from "@/components/v2/public/Carte";
import FiltresCatalogue from "@/components/v2/public/FiltresCatalogue";
import { Header, Footer } from "@/components/v2/public/Chrome";
import { libelleGroupe, libelleJour, versCarte } from "@/components/v2/public/carteData";
import { POLICES_V2 } from "@/components/v2/polices";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";
import { getEvenementsPublies, getCompteursCategories, getCompteursVilles, getVillesPubliees, type CarteData } from "@/lib/events";
import { aujourdhuiPortoNovo, ajouterJours } from "@/lib/date";
import { getPaysActuel } from "@/lib/pays";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tous les événements — XwézanEvent",
  description: "Tous les événements publiés : concerts, festivals, soirées, culture, sport au Bénin.",
};

type Params = { categorie?: string; quand?: string; date?: string; ville?: string; q?: string; tri?: string };

const QUAND: { cle: string; libelle: string }[] = [
  { cle: "", libelle: "N'importe quand" },
  { cle: "aujourdhui", libelle: "Aujourd'hui" },
  { cle: "week-end", libelle: "Ce week-end" },
  { cle: "semaine", libelle: "Cette semaine" },
  { cle: "mois", libelle: "Ce mois-ci" },
];
const TRIS: { cle: string; libelle: string }[] = [
  { cle: "", libelle: "Date" },
  { cle: "prix", libelle: "Prix croissant" },
  { cle: "prix-desc", libelle: "Prix décroissant" },
];

/** Jours (à partir d'aujourd'hui) couverts par au moins un événement : un festival couvre chaque jour de sa plage. */
function joursCouverts(evs: CarteData[], aujourdhui: string) {
  const jours = new Set<string>();
  for (const e of evs)
    for (let d = e.dateDebut > aujourdhui ? e.dateDebut : aujourdhui; d <= (e.dateFin ?? e.dateDebut); d = ajouterJours(d, 1)) jours.add(d);
  return Array.from(jours).sort();
}

const memeTexte = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

/**
 * Catalogue (V2), repris de la preview (v2/evenements). Filtres portés par
 * l'adresse (partageables, sans JavaScript) : catégorie, date (raccourci ou
 * jour précis du calendrier), ville, recherche (celle de l'en-tête). Tri réellement branché (BUGS_REFONTE n°16). Page d'action :
 * alignée à gauche. Listing limité au pays du visiteur (getPaysActuel).
 */
export default async function Evenements({ searchParams }: { searchParams: Params }) {
  const categorie = searchParams.categorie?.trim() ?? "";
  const ville = searchParams.ville?.trim() ?? "";
  const aujourdhui = aujourdhuiPortoNovo();
  // Un jour précis (calendrier) et un raccourci s'excluent : le jour l'emporte. Un jour passé est ignoré.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") && (searchParams.date as string) >= aujourdhui ? (searchParams.date as string) : "";
  const quand = !date && QUAND.some((x) => x.cle === searchParams.quand) ? (searchParams.quand as string) : "";
  const tri = TRIS.some((x) => x.cle === searchParams.tri) ? (searchParams.tri as string) : "";
  const q = (searchParams.q ?? "").trim();
  const lien = (p: Partial<Params>) => {
    const u = new URLSearchParams(Object.entries({ categorie, quand, date, ville, q, tri, ...p }).filter(([, x]) => x) as [string, string][]);
    return `/evenements${u.toString() ? `?${u}` : ""}`;
  };

  const pays = await getPaysActuel();
  const filtresHorsDate = { categorie: categorie || undefined, q: q || undefined, ville: ville || undefined, pays };
  const [trouves, horsDate, compteurs, compteursVilles, villesPubliees] = await Promise.all([
    getEvenementsPublies({ ...filtresHorsDate, quand: quand || undefined, date: date || undefined }),
    // Calendrier : jours ayant un événement pour les autres filtres. Sans filtre de date, c'est la même liste.
    date || quand ? getEvenementsPublies(filtresHorsDate) : null,
    getCompteursCategories(pays),
    getCompteursVilles(pays),
    getVillesPubliees(pays),
  ]);
  // Aucune ville = aucun événement à venir dans le pays, filtres ou non.
  const catalogueVide = villesPubliees.length === 0;

  // Tri stable : à prix égal, l'ordre par date de getEvenementsPublies est conservé.
  const resultats = tri ? [...trouves].sort((a, b) => (tri === "prix" ? a.prix - b.prix : b.prix - a.prix)) : trouves;

  // Un filtre venu d'un lien (accueil, pied de page) peut viser une valeur
  // absente des puces : elle est ajoutée pour rester visible comme active.
  const categories = Object.keys(compteurs).sort((a, b) => a.localeCompare(b, "fr"));
  if (categorie && !categories.some((c) => c === categorie)) categories.push(categorie);
  const villes = [...villesPubliees];
  const villeActive = villes.find((x) => memeTexte(x, ville)) ?? ville;
  if (ville && !villes.includes(villeActive)) villes.push(villeActive);

  // Nombre de cartes par jour (un festival forme son propre groupe), pour l'intertitre ; tri par date seulement.
  const parJour = new Map<string, number>();
  for (const e of resultats) parJour.set(e.groupeDate.cle, (parJour.get(e.groupeDate.cle) ?? 0) + 1);

  const titre = q ? `Résultats pour « ${q} »` : categorie && ville ? `${categorie} à ${villeActive}` : categorie ? categorie : ville ? `À ${villeActive}` : "Tous les événements";
  const actifs = [
    q && { libelle: `« ${q} »`, href: lien({ q: "" }) },
    categorie && { libelle: categorie, href: lien({ categorie: "" }) },
    quand && { libelle: QUAND.find((x) => x.cle === quand)?.libelle ?? quand, href: lien({ quand: "" }) },
    date && { libelle: libelleJour(date), href: lien({ date: "" }) },
    ville && { libelle: villeActive, href: lien({ ville: "" }) },
  ].filter(Boolean) as { libelle: string; href: string }[];

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className={v.h1Catalogue}>{titre}</h1>

        <FiltresCatalogue
          s={v}
          base="/evenements"
          params={{ categorie, quand, date, ville: ville ? villeActive : "", q, tri }}
          villes={villes.map((x) => ({ valeur: x, n: compteursVilles[x.trim().toLowerCase()] ?? 0 }))}
          categories={categories.map((c) => ({ valeur: c, n: compteurs[c] ?? 0 }))}
          joursAvecEvenement={joursCouverts(horsDate ?? trouves, aujourdhui)}
          aujourdhui={aujourdhui}
        />

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, margin: "24px 0 8px" }}>
          <p className={s.note} aria-live="polite">
            {resultats.length} événement{resultats.length > 1 ? "s" : ""}
            {actifs.length > 0 && (
              <>
                {" "}
                · filtres :{" "}
                {actifs.map((f) => (
                  <a key={f.libelle} href={f.href} style={{ textDecoration: "underline", marginRight: 8 }} aria-label={`Retirer le filtre ${f.libelle}`}>
                    {f.libelle} ✕
                  </a>
                ))}
                <a href="/evenements" style={{ textDecoration: "underline" }}>
                  tout effacer
                </a>
              </>
            )}
          </p>
          <p className={s.note}>
            Trier :{" "}
            {TRIS.map((t, i) => (
              <span key={t.cle || "date"}>
                {i > 0 && " · "}
                {tri === t.cle ? (
                  <b style={{ color: "#fff" }} aria-current="true">
                    {t.libelle}
                  </b>
                ) : (
                  <a href={lien({ tri: t.cle })} style={{ textDecoration: "underline" }}>
                    {t.libelle}
                  </a>
                )}
              </span>
            ))}
          </p>
        </div>

        {resultats.length === 0 ? (
          <div className={s.vide}>
            <Icon name="calendar" size={32} />
            <p className={s.videTitre}>{q ? `Aucun événement trouvé pour « ${q} »` : catalogueVide ? "Aucun événement publié pour l'instant" : "Aucun événement ne correspond"}</p>
            <p className={s.videTexte}>
              {catalogueVide ? "Les organisateurs publient chaque semaine. Reviens très bientôt !" : "Essaie une autre date, une autre ville, ou retire un filtre."}
            </p>
            {!catalogueVide && (
              <a href="/evenements" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                Voir tous les événements
              </a>
            )}
          </div>
        ) : tri ? (
          <div className={v.grille}>
            {resultats.map((e) => (
              <Carte key={e.id} e={versCarte(e)} s={v} href={e.href} />
            ))}
          </div>
        ) : (
          <div className={v.grilleJours}>
            {resultats.map((e, i) => {
              const premier = i === 0 || resultats[i - 1].groupeDate.cle !== e.groupeDate.cle;
              return (
                <div key={e.id}>
                  {premier ? (
                    <div className={v.jourTete}>
                      <h2>{libelleGroupe(e)}</h2>
                      <span className={v.jourN}>{parJour.get(e.groupeDate.cle)}</span>
                    </div>
                  ) : (
                    <div className={v.jourSuite} aria-hidden="true" />
                  )}
                  <Carte e={versCarte(e)} s={v} href={e.href} />
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

