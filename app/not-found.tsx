import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/v2/Icon";
import { Header } from "@/components/v2/public/Chrome";
import PageErreur from "@/components/v2/public/PageErreur";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Page introuvable — XwézanEvent", robots: { index: false } };

/**
 * 404 (V2), reprise de la preview (v2/404). Remplace la page par défaut de
 * Next.js, en anglais (design/BUGS_REFONTE.md, A6). Sert aussi pour tous les
 * notFound() appelés par les pages.
 */
export default function PageIntrouvable() {
  return (
    <PageErreur
      entete={<Header />}
      code="404"
      titre={
        <>
          Cette page <em>a pris un autre chemin.</em>
        </>
      }
      texte="Le lien est peut-être incomplet, ou l'événement n'est plus en ligne. Pas d'inquiétude : tes billets, eux, ne sont jamais perdus."
      actions={
        <>
          <Link href="/" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="calendar" /> Voir les événements
          </Link>
          <Link href="/billet" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="ticket" /> Retrouver mon billet
          </Link>
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
