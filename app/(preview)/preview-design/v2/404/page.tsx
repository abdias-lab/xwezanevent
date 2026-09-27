import type { Metadata } from "next";
import s from "../espace.module.css";
import Icon from "../../Icon";
import PageErreur from "../PageErreur";
import { B } from "../Coquille";

export const metadata: Metadata = { title: "Page introuvable — XwézanEvent", robots: { index: false } };

/** 404 (preview V2). En prod : app/not-found.tsx, à créer (A6). */
export default function V2Erreur404() {
  return (
    <PageErreur
      code="404"
      titre={
        <>
          Cette page <em>n&apos;existe pas.</em>
        </>
      }
      texte="Le lien est peut-être incomplet, ou l'événement n'est plus en ligne. Tes billets, eux, ne sont jamais perdus."
      actions={
        <>
          <a href={`${B}`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="calendar" /> Voir les événements
          </a>
          <a href={`${B}/billet`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="ticket" /> Retrouver mon billet
          </a>
        </>
      }
      aide={
        <>
          Un lien cassé sur le site ? Signale-le à{" "}
          <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
            contact@xwezan.com
          </a>
          .
        </>
      }
    />
  );
}
