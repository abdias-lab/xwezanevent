import type { Metadata } from "next";
import s from "../espace.module.css";
import Icon from "../../Icon";
import PageErreur from "../PageErreur";
import { B } from "../Coquille";

export const metadata: Metadata = { title: "Erreur — XwézanEvent", robots: { index: false } };

/**
 * 500 (preview V2). En prod : app/error.tsx (le bouton « Réessayer » appellera
 * reset()) et app/global-error.tsx, à créer (A6). Rappel sur le paiement : une
 * erreur pendant l'achat ne doit jamais pousser à repayer (voir bug #12).
 */
export default function V2Erreur500() {
  return (
    <PageErreur
      code="500"
      titre={
        <>
          Petit contretemps <em>de notre côté.</em>
        </>
      }
      texte="Rien de ta faute, et rien de perdu. Réessaie dans un instant ; si ça continue, écris-nous."
      actions={
        <>
          <a href={`${B}/500`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="repeat" /> Réessayer
          </a>
          <a href={`${B}`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            Retour à l&apos;accueil
          </a>
        </>
      }
      aide={
        <>
          Tu étais en train de payer ? <b>Ne repaie pas</b> : vérifie d&apos;abord{" "}
          <a href={`${B}/compte`} style={{ textDecoration: "underline" }}>
            tes billets
          </a>{" "}
          ou{" "}
          <a href={`${B}/billet`} style={{ textDecoration: "underline" }}>
            retrouve-les par e-mail
          </a>
          . Besoin d&apos;aide : contact@xwezan.com.
        </>
      }
    />
  );
}
