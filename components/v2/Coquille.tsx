import type { ReactNode } from "react";
import Link from "next/link";
import v from "./v2.module.css";
import s from "./espace.module.css";
import Icon, { type IconName } from "./Icon";
import Deconnexion from "./Deconnexion";
import { POLICES_V2 } from "./polices";

/** `secondaire` : visible dans la colonne latérale, regroupé sous « Plus » dans la barre basse. */
export type EntreeNav = { cle: string; libelle: string; court?: string; href: string; icone: IconName; secondaire?: boolean };

/**
 * Navigation d'un espace de travail. `creer`, s'il existe, est l'action
 * centrale de la barre basse ; `plus` mène aux entrées secondaires sur mobile.
 */
export type Nav = { entrees: EntreeNav[]; creer?: EntreeNav; plus?: EntreeNav; role: string };

export type Compte = { nom: string; email: string };

/**
 * Coquille des espaces de travail V2 (admin, organisateur) : colonne latérale
 * ≥ 1024 px, barre supérieure + barre basse au pouce en dessous. Charge les
 * polices V2 (components/v2/polices.ts) pour la page qu'elle englobe.
 */
export default function Coquille({ nav, actif, compte, children }: { nav: Nav; actif: string; compte: Compte; children: ReactNode }) {
  const creer = nav.creer;
  const secondaires = nav.entrees.filter((e) => e.secondaire).map((e) => e.cle);
  const onglets = [...nav.entrees.filter((e) => !e.secondaire), ...(nav.plus ? [nav.plus] : [])];
  const moitie = Math.ceil(onglets.length / 2);
  const estActif = (e: EntreeNav) => actif === e.cle || (e === nav.plus && secondaires.includes(actif));
  const tab = (e: EntreeNav) => (
    <Link key={e.cle} href={e.href} className={`${s.tab} ${estActif(e) ? s.tabOn : ""}`} aria-current={estActif(e) ? "page" : undefined}>
      <Icon name={e.icone} size={24} />
      {e.court ?? e.libelle}
    </Link>
  );
  const logo = (
    <Link href={nav.entrees[0].href} className={v.logo} aria-label={`XwézanEvent, ${nav.role.toLowerCase()}`}>
      <span className={v.logoX}>Xwézan</span>
    </Link>
  );

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <div className={s.app}>
        <header className={s.topbar}>
          {logo}
          <span className={s.role}>{nav.role}</span>
          <span style={{ display: "flex", gap: 4 }}>
            <Link href="/compte" className={s.iconeBtn} aria-label="Mes billets">
              <Icon name="ticket" size={20} />
            </Link>
            <Link href="/" className={s.iconeBtn} aria-label="Voir le site">
              <Icon name="eye" size={20} />
            </Link>
          </span>
        </header>

        <aside className={s.lateral}>
          {logo}
          <p className={s.role}>{nav.role}</p>
          <nav aria-label="Navigation de l'espace" style={{ display: "grid", gap: 4 }}>
            {nav.entrees.map((e) => (
              <Link key={e.cle} href={e.href} className={`${s.latLien} ${actif === e.cle ? s.latOn : ""}`} aria-current={actif === e.cle ? "page" : undefined}>
                <Icon name={e.icone} size={20} />
                {e.libelle}
              </Link>
            ))}
          </nav>
          {creer && (
            <Link href={creer.href} className={`${s.btn} ${s.btnOr} ${s.latCreer}`}>
              <Icon name={creer.icone} /> {creer.libelle}
            </Link>
          )}
          <div className={s.latBas}>
            <Link href="/compte" className={s.latLien}>
              <Icon name="ticket" size={20} /> Mes billets
            </Link>
            <Link href="/" className={s.latLien}>
              <Icon name="eye" size={20} /> Voir le site
            </Link>
            <Deconnexion />
            <div className={s.latCompte}>
              <span className={s.avatar} aria-hidden="true">
                {compte.nom.charAt(0).toUpperCase()}
              </span>
              <div>
                {compte.nom}
                <span>{compte.email}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className={s.principal}>{children}</main>

        <nav className={s.tabbar} aria-label="Navigation de l'espace" style={{ gridTemplateColumns: `repeat(${onglets.length + (creer ? 1 : 0)}, 1fr)` }}>
          {onglets.slice(0, moitie).map(tab)}
          {creer && (
            <Link href={creer.href} className={s.tabCreer} aria-label={creer.libelle}>
              <span>
                <Icon name={creer.icone} size={24} />
              </span>
            </Link>
          )}
          {onglets.slice(moitie).map(tab)}
        </nav>
      </div>
    </div>
  );
}
