import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import Carte from "../../Carte";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import { EVENEMENTS, jour, jourSemaine, mois, type Evenement } from "../../_data";
import { AUJOURDHUI } from "../orga/_orga";

export const metadata: Metadata = { title: "Tous les événements — XwézanEvent" };

type Params = { categorie?: string; quand?: string; ville?: string; q?: string; tri?: string; etat?: string };

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
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Catalogue (preview V2). En prod : app/(public)/evenements. Filtres portés
 * par l'adresse, comme en prod (partageables, sans JavaScript) : catégorie,
 * date, ville, recherche. Tri réellement branché (en prod, le menu « Trier »
 * ne fait rien : BUGS_REFONTE #16). Page d'action : alignée à gauche.
 */
export default function V2Catalogue({ searchParams }: { searchParams: Params }) {
  const { categorie = "", quand = "", ville = "", tri = "" } = searchParams;
  const q = (searchParams.q ?? "").trim();
  const base = searchParams.etat === "vide" ? [] : EVENEMENTS;
  const lien = (p: Partial<Params>) => {
    const u = new URLSearchParams(Object.entries({ categorie, quand, ville, q, tri, ...p }).filter(([, x]) => x) as [string, string][]);
    return `${B}/evenements${u.toString() ? `?${u}` : ""}`;
  };

  const per = periode(quand);
  const resultats = base
    .filter((e) => !categorie || e.categorie === categorie)
    .filter((e) => !ville || e.ville === ville)
    .filter((e) => !per || (e.debut <= per[1] && (e.fin ?? e.debut) >= per[0]))
    .filter((e) => !q || norm(`${e.titre} ${e.lieu} ${e.ville} ${e.categorie}`).includes(norm(q)))
    .sort((a, b) => (tri === "prix" ? a.prixMin - b.prixMin : tri === "prix-desc" ? b.prixMin - a.prixMin : a.debut.localeCompare(b.debut)));

  const categories = Array.from(new Set(base.map((e) => e.categorie))).sort();
  const villes = Array.from(new Set(base.map((e) => e.ville))).sort();
  const compteCat = (c: string) => base.filter((e) => e.categorie === c).length;

  // Groupement par jour seulement pour le tri par date (un tri par prix mélange les dates).
  const groupes: [string, Evenement[]][] = [];
  if (!tri)
    for (const e of resultats) {
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier[0] === e.debut) dernier[1].push(e);
      else groupes.push([e.debut, [e]]);
    }

  const titre = q ? `Résultats pour « ${q} »` : categorie && ville ? `${categorie} à ${ville}` : categorie ? categorie : ville ? `À ${ville}` : "Tous les événements";
  const actifs = [
    q && { libelle: `« ${q} »`, href: lien({ q: "" }) },
    categorie && { libelle: categorie, href: lien({ categorie: "" }) },
    quand && { libelle: QUAND.find((x) => x.cle === quand)?.libelle ?? quand, href: lien({ quand: "" }) },
    ville && { libelle: ville, href: lien({ ville: "" }) },
  ].filter(Boolean) as { libelle: string; href: string }[];

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32, paddingBottom: 64 }}>
        <h1 className={v.h1}>{titre}</h1>

        <form action={`${B}/evenements`} method="get" className={s.recherche} role="search" style={{ marginTop: 16, maxWidth: 560 }}>
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
                <span style={{ opacity: 0.55, fontWeight: 500 }}>{compteCat(c)}</span>
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
              <a key={x} href={lien({ ville: x })} className={`${s.puce} ${ville === x ? s.puceOn : ""}`} aria-current={ville === x ? "true" : undefined}>
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
          groupes.map(([date, evs]) => (
            <div key={date} className={v.groupe}>
              <div className={v.groupeTete}>
                <span>
                  {jourSemaine(date).replace(".", "")} {Number(jour(date))} {mois(date)}
                </span>
                <span className={v.groupeN}>{evs.length}</span>
              </div>
              <div className={v.grille}>
                {evs.map((e) => (
                  <Carte key={e.slug} e={e} s={v} href={`${B}/evenement`} />
                ))}
              </div>
            </div>
          ))
        )}
        <RubanEtats chemin={`${B}/evenements`} etats={["normal", "vide"]} />
      </main>
      <Footer />
    </div>
  );
}

function Filtre({ libelle, children }: { libelle: string; children: React.ReactNode }) {
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
