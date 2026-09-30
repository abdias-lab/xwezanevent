import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import Carte from "../../Carte";
import FiltresCatalogue from "../../FiltresCatalogue";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import { EVENEMENTS, jour, jourSemaine, mois, type Evenement } from "../../_data";
import { AUJOURDHUI } from "../orga/_orga";

export const metadata: Metadata = { title: "Tous les événements — XwézanEvent" };

type Params = { categorie?: string; quand?: string; date?: string; ville?: string; q?: string; tri?: string; etat?: string };

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

const ajouter = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
/** Période couverte par un filtre « quand » (dates incluses), par rapport à aujourd'hui. */
function periode(quand: string): [string, string] | null {
  const jourSem = new Date(`${AUJOURDHUI}T00:00:00Z`).getUTCDay(); // 0 = dimanche
  if (quand === "aujourdhui") return [AUJOURDHUI, AUJOURDHUI];
  if (quand === "week-end") return jourSem === 0 ? [AUJOURDHUI, AUJOURDHUI] : [ajouter(AUJOURDHUI, 6 - jourSem), ajouter(AUJOURDHUI, 7 - jourSem)];
  if (quand === "semaine") return [AUJOURDHUI, ajouter(AUJOURDHUI, 6)];
  if (quand === "mois") return [AUJOURDHUI, `${AUJOURDHUI.slice(0, 7)}-31`];
  return null;
}
/** Tous les jours couverts par un événement (un festival couvre chaque jour de sa plage). */
function joursCouverts(evs: Evenement[]) {
  const jours = new Set<string>();
  for (const e of evs) for (let d = e.debut; d <= (e.fin ?? e.debut); d = ajouter(d, 1)) jours.add(d);
  return Array.from(jours).sort();
}
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Catalogue (preview V2). En prod : app/(public)/evenements. Filtres portés
 * par l'adresse, comme en prod (partageables, sans JavaScript) : catégorie,
 * date (raccourci ou jour précis du calendrier), ville, recherche (celle de
 * l'en-tête). Tri réellement branché (en prod, le menu « Trier »
 * ne fait rien : BUGS_REFONTE #16). Page d'action : alignée à gauche.
 */
export default function V2Catalogue({ searchParams }: { searchParams: Params }) {
  const { categorie = "", ville = "", tri = "" } = searchParams;
  // Un jour précis (calendrier) et un raccourci s'excluent : le jour l'emporte.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? "") ? (searchParams.date as string) : "";
  const quand = date ? "" : searchParams.quand ?? "";
  const q = (searchParams.q ?? "").trim();
  const base = searchParams.etat === "vide" ? [] : EVENEMENTS;
  const lien = (p: Partial<Params>) => {
    const u = new URLSearchParams(Object.entries({ categorie, quand, date, ville, q, tri, ...p }).filter(([, x]) => x) as [string, string][]);
    return `${B}/evenements${u.toString() ? `?${u}` : ""}`;
  };

  const per: [string, string] | null = date ? [date, date] : periode(quand);
  // Hors date : sert aussi à griser les jours sans événement du calendrier.
  const sansDate = base
    .filter((e) => !categorie || e.categorie === categorie)
    .filter((e) => !ville || e.ville === ville)
    .filter((e) => !q || norm(`${e.titre} ${e.lieu} ${e.ville} ${e.categorie}`).includes(norm(q)));
  const resultats = sansDate
    .filter((e) => !per || (e.debut <= per[1] && (e.fin ?? e.debut) >= per[0]))
    .sort((a, b) => (tri === "prix" ? a.prixMin - b.prixMin : tri === "prix-desc" ? b.prixMin - a.prixMin : a.debut.localeCompare(b.debut)));

  const categories = Array.from(new Set(base.map((e) => e.categorie))).sort();
  const villes = Array.from(new Set(base.map((e) => e.ville))).sort();
  const compte = (f: (e: Evenement) => boolean) => base.filter(f).length;

  // Nombre de cartes par jour, pour l'intertitre (tri par date seulement : un tri par prix mélange les dates).
  const parJour = new Map<string, number>();
  for (const e of resultats) parJour.set(e.debut, (parJour.get(e.debut) ?? 0) + 1);

  const titre = q ? `Résultats pour « ${q} »` : categorie && ville ? `${categorie} à ${ville}` : categorie ? categorie : ville ? `À ${ville}` : "Tous les événements";
  const actifs = [
    q && { libelle: `« ${q} »`, href: lien({ q: "" }) },
    categorie && { libelle: categorie, href: lien({ categorie: "" }) },
    quand && { libelle: QUAND.find((x) => x.cle === quand)?.libelle ?? quand, href: lien({ quand: "" }) },
    date && { libelle: `${jourSemaine(date).replace(".", "")} ${Number(jour(date))} ${mois(date)}`, href: lien({ date: "" }) },
    ville && { libelle: ville, href: lien({ ville: "" }) },
  ].filter(Boolean) as { libelle: string; href: string }[];

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className={v.h1Catalogue}>{titre}</h1>

        <FiltresCatalogue
          s={v}
          base={`${B}/evenements`}
          params={{ categorie, quand, date, ville, q, tri }}
          villes={villes.map((x) => ({ valeur: x, n: compte((e) => e.ville === x) }))}
          categories={categories.map((c) => ({ valeur: c, n: compte((e) => e.categorie === c) }))}
          joursAvecEvenement={joursCouverts(sansDate)}
          aujourdhui={AUJOURDHUI}
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
                <a href={`${B}/evenements`} style={{ textDecoration: "underline" }}>
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
            <p className={s.videTitre}>{q ? `Aucun événement trouvé pour « ${q} »` : base.length === 0 ? "Aucun événement publié pour l'instant" : "Aucun événement ne correspond"}</p>
            <p className={s.videTexte}>
              {base.length === 0 ? "Les organisateurs publient chaque semaine. Reviens très bientôt !" : "Essaie une autre date, une autre ville, ou retire un filtre."}
            </p>
            {base.length > 0 && (
              <a href={`${B}/evenements`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                Voir tous les événements
              </a>
            )}
          </div>
        ) : tri ? (
          <div className={v.grille}>
            {resultats.map((e) => (
              <Carte key={e.slug} e={e} s={v} href={`${B}/evenement`} />
            ))}
          </div>
        ) : (
          <div className={v.grilleJours}>
            {resultats.map((e, i) => {
              const premier = i === 0 || resultats[i - 1].debut !== e.debut;
              return (
                <div key={e.slug}>
                  {premier ? (
                    <div className={v.jourTete}>
                      <h2>
                        {jourSemaine(e.debut).replace(".", "")} {Number(jour(e.debut))} {mois(e.debut)}
                      </h2>
                      <span className={v.jourN}>{parJour.get(e.debut)}</span>
                    </div>
                  ) : (
                    <div className={v.jourSuite} aria-hidden="true" />
                  )}
                  <Carte e={e} s={v} href={`${B}/evenement`} />
                </div>
              );
            })}
          </div>
        )}
        <RubanEtats chemin={`${B}/evenements`} etats={["normal", "vide"]} />
      </main>
      <Footer />
    </div>
  );
}

