"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "../../espace.module.css";
import v from "../../v2.module.css";
import Icon from "../../Icon";
import Carte from "../../public/Carte";
import type { EvenementCarte } from "../../public/evenement";

/**
 * Écran après envoi (V2), repris de la preview (v2/creer/Formulaire.tsx,
 * Confirmation) : l'événement part en validation (statut en_validation), ou
 * `publie` pour un compte vérifié, publié directement (design/ARTISTES.md).
 */
export default function Confirmation({ apercu, email, publie = false }: { apercu: EvenementCarte; email: string; publie?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titreRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("inert", "");
    titreRef.current?.focus();
  }, []);
  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 560 }}>
      <div style={{ display: "grid", gap: 12, justifyItems: "start" }} role="status">
        <Icon name="check" size={48} className={s.montantOr} />
        <h2 ref={titreRef} tabIndex={-1} className={s.titre} style={{ outline: "none" }}>
          {publie ? "Publié" : "Envoyé pour validation"}
        </h2>
        <p className={s.sousTitre} style={{ marginTop: 0 }}>
          {publie ? (
            <>« {apercu.titre} » est en ligne et en vente. Ton compte est vérifié : il n&apos;attend pas la validation de l&apos;équipe.</>
          ) : (
            <>
              L&apos;équipe Xwézan vérifie « {apercu.titre} » avant sa mise en ligne. Tu reçois un e-mail à <b>{email}</b> dès qu&apos;il est validé.
            </>
          )}
        </p>
      </div>

      <div ref={ref} aria-hidden="true">
        <Carte e={apercu} s={v} href="#" />
      </div>

      <div className={s.panneau}>
        <p className={s.panneauTitre}>Et ensuite ?</p>
        <ol className={s.checklist} style={{ listStyle: "none", padding: 0 }}>
          {publie ? (
            <>
              <li className={s.fait}>
                <Icon name="check" size={16} /> Il est en vente : statut « En vente » dans ton tableau de bord
              </li>
              <li>
                <Icon name="link" size={16} /> Partage le lien de ta page pour lancer les ventes
              </li>
            </>
          ) : (
            <>
              <li className={s.fait}>
                <Icon name="check" size={16} /> Il apparaît déjà dans ton tableau de bord, statut « En validation »
              </li>
              <li>
                <Icon name="clock" size={16} /> Après validation par l&apos;équipe, il est mis en vente et tu reçois un e-mail
              </li>
              <li>
                <Icon name="link" size={16} /> Partage alors le lien de ta page pour lancer les ventes
              </li>
            </>
          )}
        </ol>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {publie && (
          <Link href={`/evenement/${apercu.slug}`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="eye" /> Voir la page
          </Link>
        )}
        <Link href="/orga" className={`${s.btn} ${publie ? s.btnGris : s.btnOr} ${s.btnGrand}`}>
          Voir mon tableau de bord
        </Link>
        <Link href="/creer" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
          <Icon name="plus" /> Créer un autre événement
        </Link>
      </div>
    </div>
  );
}
