"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import v from "../v2.module.css";
import Icon from "../../Icon";

/**
 * Abonnement à un artiste sur sa page (design/ARTISTES.md, lot 3). La page
 * reste en cache : l'état du visiteur (connecté, abonné) et le compteur à
 * jour viennent de /api/abonnements/artistes/[id]. Abonnement avec compte :
 * un visiteur non connecté passe par la connexion et revient sur la page.
 * Refonte 2026-10-09 : le compteur est dans le bandeau, le bouton dessous,
 * avant les réseaux. Un seul état partagé (AbonnementArtiste englobe les
 * deux) : le compteur suit le bouton.
 * Preview : copie de components/v2/public/AbonnementArtiste.tsx ; l'appel à
 * l'API est remplacé par un état simulé (`initial`, piloté par ?etat=).
 */
interface Abonnement {
  slug: string;
  etat: { connecte: boolean; abonne: boolean } | null;
  abonnes: number;
  enCours: boolean;
  erreur: string | null;
  basculer: () => void;
}

const Contexte = createContext<Abonnement | null>(null);

function useAbonnement(): Abonnement {
  const a = useContext(Contexte);
  if (!a) throw new Error("À utiliser dans <AbonnementArtiste>");
  return a;
}

export default function AbonnementArtiste({
  slug,
  abonnesInitial,
  initial,
  children,
}: {
  slug: string;
  abonnesInitial: number;
  initial: { connecte: boolean; abonne: boolean };
  children: ReactNode;
}) {
  const [etat, setEtat] = useState<{ connecte: boolean; abonne: boolean } | null>(initial);
  const [abonnes, setAbonnes] = useState(abonnesInitial);
  const [enCours, setEnCours] = useState(false);
  const erreur: string | null = null;

  async function basculer() {
    if (!etat) return;
    setEnCours(true);
    await new Promise((r) => setTimeout(r, 400));
    setAbonnes((n) => n + (etat.abonne ? -1 : 1));
    setEtat({ connecte: true, abonne: !etat.abonne });
    setEnCours(false);
  }

  return <Contexte.Provider value={{ slug, etat, abonnes, enCours, erreur, basculer }}>{children}</Contexte.Provider>;
}

/** Nombre d'abonnés, dans le bandeau. */
export function CompteurAbonnes() {
  const { abonnes } = useAbonnement();
  return (
    <p className={v.artMeta}>
      <b className={v.chiffreArt}>{abonnes.toLocaleString("fr-FR").replace(/ /g, " ")}</b> abonné{abonnes > 1 ? "s" : ""}
    </p>
  );
}

/** « S'abonner » / « Abonné » (cliquer à nouveau désabonne), sous le bandeau. */
export function BoutonAbonner() {
  const { slug, etat, enCours, erreur, basculer } = useAbonnement();
  const abonne = !!etat?.abonne;
  return (
    <div className={v.artAbonnement}>
      {etat && !etat.connecte ? (
        <a href={`/connexion?redirect=${encodeURIComponent(`/artiste/${slug}`)}`} className={v.btnAbonner}>
          S&apos;abonner
        </a>
      ) : (
        <button type="button" className={abonne ? v.btnAbonne : v.btnAbonner} aria-pressed={abonne} disabled={!etat || enCours} onClick={basculer}>
          {abonne && <Icon name="check" />} {abonne ? "Abonné" : "S'abonner"}
        </button>
      )}
      <span className={v.artAbonnementNote} aria-live="polite">
        {erreur}
      </span>
    </div>
  );
}
