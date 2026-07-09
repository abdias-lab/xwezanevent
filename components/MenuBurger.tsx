"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";

/**
 * Menu burger mobile (<768px) : reprend exactement les mêmes liens
 * et actions que la nav desktop, masquée à cette largeur.
 */
export default function MenuBurger({ connecte }: { connecte: boolean }) {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    document.body.style.overflow = ouvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  function fermer() {
    setOuvert(false);
  }

  return (
    <>
      <button
        type="button"
        className="burger"
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={ouvert}
        aria-controls="menu-mobile"
        onClick={() => setOuvert((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      <div
        className={`menu-overlay ${ouvert ? "est-ouvert" : ""}`}
        onClick={fermer}
        aria-hidden={!ouvert}
      />

      <div
        id="menu-mobile"
        className={`menu-mobile ${ouvert ? "est-ouvert" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation mobile"
      >
        <button
          type="button"
          className="menu-mobile-fermer"
          aria-label="Fermer le menu"
          onClick={fermer}
        >
          ✕
        </button>

        <nav className="menu-mobile-liens" aria-label="Navigation principale">
          <Link href="/evenements" onClick={fermer}>
            Événements
          </Link>
          <Link href="/#categories" onClick={fermer}>
            Catégories
          </Link>
          <Link href="/#villes" onClick={fermer}>
            Villes
          </Link>
        </nav>

        <div className="menu-mobile-compte">
          {connecte ? (
            <>
              <Link className="connexion" href="/compte" onClick={fermer}>
                Mon compte
              </Link>
              <span onClick={fermer}>
                <BoutonDeconnexion />
              </span>
            </>
          ) : (
            <Link className="connexion" href="/connexion" onClick={fermer}>
              Se connecter
            </Link>
          )}
        </div>

        <Link className="btn btn-or cta-header" href="/creer" onClick={fermer}>
          Publier un événement
        </Link>
      </div>
    </>
  );
}
