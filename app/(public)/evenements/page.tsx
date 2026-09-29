import type { Metadata } from "next";
import type { ReactNode } from "react";
import Icon from "@/components/v2/Icon";
import Carte from "@/components/v2/public/Carte";
import { Header, Footer } from "@/components/v2/public/Chrome";
import { libelleGroupe, versCarte } from "@/components/v2/public/carteData";
import { POLICES_V2 } from "@/components/v2/polices";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";
import { getEvenementsPublies, getCompteursCategories, getVillesPubliees, type CarteData } from "@/lib/events";
import { getPaysActuel } from "@/lib/pays";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Tous les événements — XwézanEvent",
  description: "Tous les événements publiés : concerts, festivals, soirées, culture, sport au Bénin.",
};

type Params = { categorie?: string; quand?: string; ville?: string; q?: string; tri?: string };

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

const memeTexte = (a: string, b: string) => a.localeCompare(b, "fr", { sensitivity: "base" }) === 0;

/**
 * Catalogue (V2), repris de la preview (v2/evenements). Filtres portés par
 * l'adresse (partageables, sans JavaScript) : catégorie, date, ville,
 * recherche. Tri réellement branché (BUGS_REFONTE n°16). Page d'action :
 * alignée à gauche. Listing limité au pays du visiteur (getPaysActuel).
 */
export default async function Evenements({ searchParams }: { searchParams: Params }) {
  const categorie = searchParams.categorie?.trim() ?? "";
  const ville = searchParams.ville?.trim() ?? "";
  const quand = QUAND.some((x) => x.cle === searchParams.quand) ? (searchParams.quand as string) : "";
  const tri = TRIS.some((x) => x.cle === searchParams.tri) ? (searchParams.tri as string) : "";
  const q = (searchParams.q ?? "").trim();
  const lien = (p: Partial<Params>) => {
    const u = new URLSearchParams(Object.entries({ categorie, quand, ville, q, tri, ...p }).filter(([, x]) => x) as [string, string][]);
    return `/evenements${u.toString() ? `?${u}` : ""}`;
  };

  const pays = await getPaysActuel();
  const [trouves, compteurs, villesPubliees] = await Promise.all([
    getEvenementsPublies({ categorie: categorie || undefined, quand: quand || undefined, q: q || undefined, ville: ville || undefined, pays }),
    getCompteursCategories(pays),
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

  // Groupement par jour seulement pour le tri par date (un tri par prix mélange les dates).
  const groupes: [string, string, CarteData[]][] = [];
  if (!tri)
    for (const e of resultats) {
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier[0] === e.groupeDate.cle) dernier[2].push(e);
      else groupes.push([e.groupeDate.cle, libelleGroupe(e), [e]]);
    }

  const titre = q ? `Résultats pour « ${q} »` : categorie && ville ? `${categorie} à ${villeActive}` : categorie ? categorie : ville ? `À ${villeActive}` : "Tous les événements";
  const actifs = [
    q && { libelle: `« ${q} »`, href: lien({ q: "" }) },
    categorie && { libelle: categorie, href: lien({ categorie: "" }) },
    quand && { libelle: QUAND.find((x) => x.cle === quand)?.libelle ?? quand, href: lien({ quand: "" }) },
    ville && { libelle: villeActive, href: lien({ ville: "" }) },
  ].filter(Boolean) as { libelle: string; href: string }[];

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className={v.h1}>{titre}</h1>

        <form action="/evenements" method="get" className={s.recherche} role="search" style={{ marginTop: 16, maxWidth: 560 }}>
          <Icon name="search" size={20} />
          <input type="search" name="q" defaultValue={q} placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
          {categorie && <input type="hidden" name="categorie" value={categorie} />}
          {quand && <input type="hidden" name="quand" value={quand} />}
          {ville && <input type="hidden" name="ville" value={ville} />}
          {tri && <input type="hidden" name="tri" value={tri} />}
        </form>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <Filtre libelle="Catégorie">
            <a href={lien({ categorie: "" })} className={`${s.puce} ${!categorie ? s.puceOn : ""}`} aria-current={!categorie ? "true" : undefined}>
              Toutes
            </a>
            {categories.map((c) => (
              <a key={c} href={lien({ categorie: c })} className={`${s.puce} ${categorie === c ? s.puceOn : ""}`} aria-current={categorie === c ? "true" : undefined}>
                {c}
                <span style={{ opacity: 0.55, fontWeight: 500 }}>{compteurs[c] ?? 0}</span>
              </a>
            ))}
          </Filtre>
          <Filtre libelle="Quand">
            {QUAND.map((x) => (
              <a key={x.cle || "tout"} href={lien({ quand: x.cle })} className={`${s.puce} ${quand === x.cle ? s.puceOn : ""}`} aria-current={quand === x.cle ? "true" : undefined}>
                {x.libelle}
              </a>
            ))}
          </Filtre>
          <Filtre libelle="Ville">
            <a href={lien({ ville: "" })} className={`${s.puce} ${!ville ? s.puceOn : ""}`} aria-current={!ville ? "true" : undefined}>
              Toutes
            </a>
            {villes.map((x) => (
              <a key={x} href={lien({ ville: x })} className={`${s.puce} ${ville && x === villeActive ? s.puceOn : ""}`} aria-current={ville && x === villeActive ? "true" : undefined}>
                {x}
              </a>
            ))}
          </Filtre>
        </div>

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
          groupes.map(([cle, libelle, evs]) => (
            <div key={cle} className={v.groupe}>
              <div className={v.groupeTete}>
                <span>{libelle}</span>
                <span className={v.groupeN}>{evs.length}</span>
              </div>
              <div className={v.grille}>
                {evs.map((e) => (
                  <Carte key={e.id} e={versCarte(e)} s={v} href={e.href} />
                ))}
              </div>
            </div>
          ))
        )}
      </main>
      <Footer />
    </div>
  );
}

function Filtre({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", minWidth: 0 }}>
      <span className={s.note} style={{ flex: "none", width: 72 }}>
        {libelle}
      </span>
      <div className={`${s.puces} ${s.pucesDefil}`} role="group" aria-label={libelle}>
        {children}
      </div>
    </div>
  );
}
