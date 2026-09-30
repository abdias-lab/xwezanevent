"use client";

import Link from "next/link";
import { useEffect } from "react";
import Icon from "../Icon";
import s from "../espace.module.css";
import { HeaderClient } from "./EnteteClient";
import PageErreur from "./PageErreur";

/**
 * Erreur 500 (V2), reprise de la preview (v2/500), partagée par app/error.tsx
 * et app/global-error.tsx. « Réessayer » relance le rendu (reset()). Rappel
 * sur le paiement : une erreur pendant l'achat ne doit jamais pousser à
 * repayer (BUGS_REFONTE n°12).
 */
export default function Erreur500({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Un composant client ne peut pas exporter de metadata.
    document.title = "Erreur — XwézanEvent";
    console.error("[erreur]", error.digest ?? "", error);
  }, [error]);

  return (
    <PageErreur
      entete={<HeaderClient />}
      code="500"
      titre={
        <>
          Petit contretemps <em>de notre côté.</em>
        </>
      }
      texte="Rien de ta faute, et rien de perdu. Réessaie dans un instant ; si ça continue, écris-nous."
      actions={
        <>
          <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => reset()}>
            <Icon name="repeat" /> Réessayer
          </button>
          <Link href="/" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            Retour à l&apos;accueil
          </Link>
        </>
      }
      aide={
        <>
          Tu étais en train de payer ? <b>Ne repaie pas</b> : vérifie d&apos;abord{" "}
          <Link href="/compte" style={{ textDecoration: "underline" }}>
            tes billets
          </Link>{" "}
          ou{" "}
          <Link href="/billet" style={{ textDecoration: "underline" }}>
            retrouve-les par e-mail
          </Link>
          . Besoin d&apos;aide : contact@xwezan.com.
        </>
      }
    />
  );
}
