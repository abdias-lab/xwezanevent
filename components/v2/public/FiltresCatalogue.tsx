"use client";

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import Icon from "../Icon";
import { libelleJour } from "./carteData";

type Styles = Record<string, string>;
export type OptionFiltre = { valeur: string; n: number };
export type ParamsCatalogue = { categorie: string; quand: string; date: string; ville: string; q: string; tri: string };
type Cle = "ville" | "categorie" | "date";

const RACCOURCIS: { cle: string; libelle: string }[] = [
  { cle: "aujourdhui", libelle: "Aujourd'hui" },
  { cle: "week-end", libelle: "Ce week-end" },
  { cle: "mois", libelle: "Ce mois-ci" },
];
const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ENTETES = ["L", "M", "M", "J", "V", "S", "D"];
/** Au-delà, la liste d'options reçoit un champ de recherche. */
const SEUIL_RECHERCHE = 8;
/** Glissement vers le bas (px) qui ferme la feuille sur mobile. */
const SEUIL_GLISSEMENT = 80;

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const iso = (y: number, m: number, j: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
const estMobile = () => window.matchMedia("(max-width: 599px)").matches;


/**
 * Filtres du catalogue (repris de preview-design/FiltresCatalogue.tsx) : trois boutons déroulants (Ville, Catégorie, Date) sur
 * une ligne. Panneau flottant sous le bouton sur grand écran, feuille remontant
 * du bas sur mobile (fermeture par glissement, tap à l'extérieur ou Échap).
 * Chaque option est un lien : les filtres restent portés par l'adresse, et
 * sans JavaScript les <details> s'ouvrent quand même.
 */
export default function FiltresCatalogue({
  s,
  base,
  params,
  villes,
  categories,
  joursAvecEvenement,
  aujourdhui,
}: {
  s: Styles;
  base: string;
  params: ParamsCatalogue;
  villes: OptionFiltre[];
  categories: OptionFiltre[];
  joursAvecEvenement: string[];
  aujourdhui: string;
}) {
  const [ouvert, setOuvert] = useState<Cle | null>(null);
  const lien = (p: Partial<ParamsCatalogue>) => {
    const u = new URLSearchParams(Object.entries({ ...params, ...p }).filter(([, x]) => x) as [string, string][]);
    return `${base}${u.toString() ? `?${u}` : ""}`;
  };

  // Échap ferme ; sur mobile, la page ne défile pas sous la feuille.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(null);
    document.addEventListener("keydown", surTouche);
    const bloque = estMobile();
    if (bloque) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      if (bloque) document.body.style.overflow = "";
    };
  }, [ouvert]);

  const quandLibelle = RACCOURCIS.find((r) => r.cle === params.quand)?.libelle ?? (params.quand === "semaine" ? "Cette semaine" : "");
  const props = { s, ouvert, setOuvert };

  return (
    <div className={s.filtresLigne}>
      <Menu {...props} cle="ville" libelle="Ville" valeur={params.ville}>
        <ListeOptions s={s} options={villes} active={params.ville} tous="Toutes les villes" lien={(x) => lien({ ville: x })} />
      </Menu>
      <Menu {...props} cle="categorie" libelle="Catégorie" valeur={params.categorie}>
        <ListeOptions s={s} options={categories} active={params.categorie} tous="Toutes les catégories" lien={(x) => lien({ categorie: x })} />
      </Menu>
      <Menu {...props} cle="date" libelle="Date" valeur={params.date ? libelleJour(params.date) : quandLibelle}>
        <div className={s.raccourcis}>
          {RACCOURCIS.map((r) => (
            <a key={r.cle} href={lien({ quand: r.cle, date: "" })} className={`${s.raccourci} ${params.quand === r.cle ? s.raccourciOn : ""}`} aria-current={params.quand === r.cle ? "true" : undefined}>
              {r.libelle}
            </a>
          ))}
        </div>
        <Calendrier s={s} jours={joursAvecEvenement} aujourdhui={aujourdhui} choisi={params.date} lien={(d) => lien({ date: d, quand: "" })} />
        {(params.date || params.quand) && (
          <a href={lien({ date: "", quand: "" })} className={s.filtreEffacer}>
            N&apos;importe quand
          </a>
        )}
      </Menu>
    </div>
  );
}

function Menu({
  s,
  cle,
  libelle,
  valeur,
  ouvert,
  setOuvert,
  children,
}: {
  s: Styles;
  cle: Cle;
  libelle: string;
  valeur: string;
  ouvert: Cle | null;
  setOuvert: (c: Cle | null) => void;
  children: ReactNode;
}) {
  const panneau = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLElement>(null);
  const depart = useRef<number | null>(null);
  const estOuvert = ouvert === cle;

  // À la fermeture, le focus revient au bouton (clavier, lecteur d'écran).
  const avaitOuvert = useRef(false);
  useEffect(() => {
    if (avaitOuvert.current && !estOuvert && panneau.current?.contains(document.activeElement)) bouton.current?.focus();
    avaitOuvert.current = estOuvert;
  }, [estOuvert]);

  const fermer = () => setOuvert(null);
  const debut = (e: TouchEvent) => {
    depart.current = estMobile() && (panneau.current?.scrollTop ?? 0) <= 0 ? e.touches[0].clientY : null;
  };
  const glisse = (e: TouchEvent) => {
    if (depart.current === null || !panneau.current) return;
    const dy = Math.max(0, e.touches[0].clientY - depart.current);
    panneau.current.style.transform = `translateY(${dy}px)`;
  };
  const fin = (e: TouchEvent) => {
    if (depart.current === null || !panneau.current) return;
    const dy = e.changedTouches[0].clientY - depart.current;
    panneau.current.style.transform = "";
    depart.current = null;
    if (dy > SEUIL_GLISSEMENT) fermer();
  };

  return (
    <details className={`${s.filtre} ${valeur ? s.filtreActif : ""}`} open={estOuvert}>
      <summary
        ref={bouton}
        className={`${s.filtreBouton} ${valeur ? s.filtreBoutonOn : ""}`}
        onClick={(e) => {
          e.preventDefault();
          setOuvert(estOuvert ? null : cle);
        }}
      >
        <span className={s.srOnly}>{libelle} : </span>
        <span className={s.filtreValeur}>{valeur || libelle}</span>
        <Icon name="chevron" />
      </summary>
      <div className={s.filtreFond} onClick={fermer} aria-hidden="true" />
      <div ref={panneau} className={s.filtrePanneau} role="group" aria-label={libelle} onTouchStart={debut} onTouchMove={glisse} onTouchEnd={fin}>
        <div className={s.filtrePoignee} aria-hidden="true" />
        <div className={s.filtreTete}>
          <p className={s.filtreTitre}>{libelle}</p>
          <button type="button" className={s.filtreFermer} onClick={fermer} aria-label="Fermer">
            <Icon name="x" size={20} />
          </button>
        </div>
        {children}
      </div>
    </details>
  );
}

function ListeOptions({ s, options, active, tous, lien }: { s: Styles; options: OptionFiltre[]; active: string; tous: string; lien: (x: string) => string }) {
  const [texte, setTexte] = useState("");
  const visibles = texte ? options.filter((o) => norm(o.valeur).includes(norm(texte))) : options;
  return (
    <>
      {options.length > SEUIL_RECHERCHE && (
        <label className={s.filtreRecherche}>
          <Icon name="search" size={16} />
          <input type="search" value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Rechercher" aria-label="Rechercher dans la liste" />
        </label>
      )}
      <ul className={s.options}>
        {!texte && (
          <li>
            <a href={lien("")} className={`${s.option} ${!active ? s.optionOn : ""}`} aria-current={!active ? "true" : undefined}>
              <span>{tous}</span>
              {!active && <Icon name="check" />}
            </a>
          </li>
        )}
        {visibles.map((o) => (
          <li key={o.valeur}>
            <a href={lien(o.valeur)} className={`${s.option} ${active === o.valeur ? s.optionOn : ""}`} aria-current={active === o.valeur ? "true" : undefined}>
              <span>{o.valeur}</span>
              {active === o.valeur ? <Icon name="check" /> : <span className={s.optionN}>{o.n}</span>}
            </a>
          </li>
        ))}
        {visibles.length === 0 && <li className={s.optionVide}>Aucun résultat</li>}
      </ul>
    </>
  );
}

function Calendrier({ s, jours, aujourdhui, choisi, lien }: { s: Styles; jours: string[]; aujourdhui: string; choisi: string; lien: (d: string) => string }) {
  const avec = new Set(jours);
  const [ay, am] = aujourdhui.split("-").map(Number);
  // Ouvre sur le jour choisi, sinon sur le mois du prochain événement.
  const depart = choisi && choisi >= aujourdhui ? choisi : jours.find((d) => d >= aujourdhui) ?? aujourdhui;
  const [y0, m0] = depart.split("-").map(Number);
  const [mois, setMois] = useState({ y: y0, m: m0 - 1 });
  // Bornes : du mois courant au mois du dernier événement.
  const dernier = jours.length ? jours[jours.length - 1] : aujourdhui;
  const [dy, dm] = dernier.split("-").map(Number);
  const rang = (y: number, m: number) => y * 12 + m;
  const peutReculer = rang(mois.y, mois.m) > rang(ay, am - 1);
  const peutAvancer = rang(mois.y, mois.m) < rang(dy, dm - 1);
  const decaler = (n: number) => setMois(({ y, m }) => ({ y: y + Math.floor((m + n) / 12), m: (((m + n) % 12) + 12) % 12 }));

  const nbJours = new Date(Date.UTC(mois.y, mois.m + 1, 0)).getUTCDate();
  const decalage = (new Date(Date.UTC(mois.y, mois.m, 1)).getUTCDay() + 6) % 7; // lundi en premier
  const cases: (number | null)[] = [...Array(decalage).fill(null), ...Array.from({ length: nbJours }, (_, i) => i + 1)];

  return (
    <div className={s.calendrier}>
      <div className={s.calTete}>
        <button type="button" className={s.calNav} onClick={() => decaler(-1)} disabled={!peutReculer} aria-label="Mois précédent">
          <Icon name="back" size={20} />
        </button>
        <p className={s.calMois} aria-live="polite">
          {MOIS_LONGS[mois.m]} {mois.y}
        </p>
        <button type="button" className={s.calNav} onClick={() => decaler(1)} disabled={!peutAvancer} aria-label="Mois suivant">
          <Icon name="chevron-right" size={20} />
        </button>
      </div>
      <div className={s.calGrille} role="group" aria-label={`${MOIS_LONGS[mois.m]} ${mois.y}`}>
        {ENTETES.map((j, i) => (
          <span key={i} className={s.calEntete} aria-hidden="true">
            {j}
          </span>
        ))}
        {cases.map((j, i) => {
          if (j === null) return <span key={`v${i}`} />;
          const d = iso(mois.y, mois.m, j);
          const actif = avec.has(d) && d >= aujourdhui;
          const classes = `${s.calJour} ${d === aujourdhui ? s.calAujourdhui : ""} ${d === choisi ? s.calChoisi : ""}`;
          return actif ? (
            <a key={d} href={lien(d)} className={classes} aria-current={d === choisi ? "date" : undefined} aria-label={libelleJour(d)}>
              {j}
            </a>
          ) : (
            <span key={d} className={`${classes} ${s.calSans}`} aria-disabled="true">
              {j}
            </span>
          );
        })}
      </div>
    </div>
  );
}
