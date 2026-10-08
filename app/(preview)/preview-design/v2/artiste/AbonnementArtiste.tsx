"use client";

import { useState } from "react";
import v from "../v2.module.css";
import Icon from "../../Icon";

/**
 * Compteur d'abonnés et bouton « S'abonner » de la page artiste
 * (design/ARTISTES.md, lot 3). La page reste en cache : l'état du visiteur
 * (connecté, abonné) et le compteur à jour viennent de
 * /api/abonnements/artistes/[id]. Abonnement avec compte : un visiteur non
 * connecté passe par la connexion et revient sur la page.
 * Preview : copie de components/v2/public/AbonnementArtiste.tsx ; l'appel à
 * l'API est remplacé par un état simulé (`initial`, piloté par ?etat=).
 */
export default function AbonnementArtiste({
  artisteId,
  slug,
  nom,
  nomLabel,
  abonnesInitial,
  initial,
}: {
  artisteId: string;
  slug: string;
  nom: string;
  nomLabel: string | null;
  abonnesInitial: number;
  initial: { connecte: boolean; abonne: boolean };
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

  const abonne = !!etat?.abonne;
  return (
    <>
      <p className={v.artMeta}>
        {nomLabel && (
          <>
            Label <b>{nomLabel}</b> ·{" "}
          </>
        )}
        <b className={v.chiffreArt}>{abonnes.toLocaleString("fr-FR").replace(/ /g, " ")}</b> abonné{abonnes > 1 ? "s" : ""}
      </p>
      <div className={v.artAbonnement} data-artiste={artisteId}>
        {etat && !etat.connecte ? (
          <a href={`/connexion?redirect=${encodeURIComponent(`/artiste/${slug}`)}`} className={v.btnAbonner}>
            <Icon name="plus" /> S&apos;abonner
          </a>
        ) : (
          <button
            type="button"
            className={abonne ? v.btnAbonne : v.btnAbonner}
            aria-pressed={abonne}
            disabled={!etat || enCours}
            onClick={basculer}
          >
            <Icon name={abonne ? "check" : "plus"} /> {abonne ? "Abonné" : "S'abonner"}
          </button>
        )}
        <span className={v.artAbonnementNote} aria-live="polite">
          {erreur ??
            (abonne
              ? `Tu reçois un e-mail à chaque nouvelle date de ${nom}. Clique à nouveau pour te désabonner.`
              : "Un e-mail à chaque nouvelle date. Désabonnement en un clic.")}
        </span>
      </div>
    </>
  );
}
