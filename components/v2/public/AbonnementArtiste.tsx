"use client";

import { useEffect, useState } from "react";
import v from "../v2.module.css";
import Icon from "../Icon";

/**
 * Compteur d'abonnés et bouton « S'abonner » de la page artiste
 * (design/ARTISTES.md, lot 3). La page reste en cache : l'état du visiteur
 * (connecté, abonné) et le compteur à jour viennent de
 * /api/abonnements/artistes/[id]. Abonnement avec compte : un visiteur non
 * connecté passe par la connexion et revient sur la page.
 * Copie dans la preview (v2/artiste).
 */
export default function AbonnementArtiste({
  artisteId,
  slug,
  nom,
  nomLabel,
  abonnesInitial,
}: {
  artisteId: string;
  slug: string;
  nom: string;
  nomLabel: string | null;
  abonnesInitial: number;
}) {
  const [etat, setEtat] = useState<{ connecte: boolean; abonne: boolean } | null>(null);
  const [abonnes, setAbonnes] = useState(abonnesInitial);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    fetch(`/api/abonnements/artistes/${artisteId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!actif) return;
        setEtat({ connecte: !!d.connecte, abonne: !!d.abonne });
        if (typeof d.abonnes === "number") setAbonnes(d.abonnes);
      })
      .catch(() => actif && setEtat({ connecte: false, abonne: false }));
    return () => {
      actif = false;
    };
  }, [artisteId]);

  async function basculer() {
    if (!etat) return;
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch(`/api/abonnements/artistes/${artisteId}`, { method: etat.abonne ? "DELETE" : "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Erreur");
      setEtat({ connecte: true, abonne: !!d.abonne });
      if (typeof d.abonnes === "number") setAbonnes(d.abonnes);
    } catch {
      setErreur("Impossible pour le moment, réessaie.");
    }
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
      <div className={v.artAbonnement}>
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
