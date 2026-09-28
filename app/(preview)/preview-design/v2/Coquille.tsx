import type { ReactNode } from "react";
import v from "./v2.module.css";
import s from "./espace.module.css";
import Icon, { type IconName } from "../Icon";

export const B = "/preview-design/v2";

/** `secondaire` : visible dans la colonne latérale, regroupé sous « Plus » dans la barre basse. */
export type EntreeNav = { cle: string; libelle: string; court?: string; href: string; icone: IconName; secondaire?: boolean };

/**
 * Navigation d'un espace de travail. `creer`, s'il existe, est l'action
 * centrale de la barre basse ; `plus` mène aux entrées secondaires sur mobile.
 */
export type Nav = { entrees: EntreeNav[]; creer?: EntreeNav; plus?: EntreeNav; role: string; compte: { nom: string; email: string } };

/** Navigation de l'espace organisateur. */
export const NAV_ORGA: Nav = {
  role: "Organisateur",
  entrees: [
    { cle: "accueil", libelle: "Tableau de bord", court: "Accueil", href: `${B}/orga`, icone: "home" },
    { cle: "scan", libelle: "Scanner les billets", court: "Scanner", href: `${B}/scan`, icone: "qr" },
    { cle: "reversements", libelle: "Mes reversements", court: "Virements", href: `${B}/orga/reversements`, icone: "wallet" },
    { cle: "parametres", libelle: "Paramètres", court: "Réglages", href: `${B}/orga/parametres`, icone: "settings" },
  ],
  creer: { cle: "creer", libelle: "Créer un événement", court: "Créer", href: `${B}/creer`, icone: "plus" },
  compte: { nom: "Ouidah Live", email: "contact@ouidahlive.bj" },
};

/**
 * Coquille des espaces de travail : colonne latérale ≥ 1024 px,
 * barre supérieure + barre basse au pouce en dessous.
 */
export default function Coquille({ nav = NAV_ORGA, actif, children }: { nav?: Nav; actif: string; children: ReactNode }) {
  const creer = nav.creer;
  const secondaires = nav.entrees.filter((e) => e.secondaire).map((e) => e.cle);
  const onglets = [...nav.entrees.filter((e) => !e.secondaire), ...(nav.plus ? [nav.plus] : [])];
  const moitie = Math.ceil(onglets.length / 2);
  const estActif = (e: EntreeNav) => actif === e.cle || (e === nav.plus && secondaires.includes(actif));
  const tab = (e: EntreeNav) => (
    <a key={e.cle} href={e.href} className={`${s.tab} ${estActif(e) ? s.tabOn : ""}`} aria-current={estActif(e) ? "page" : undefined}>
      <Icon name={e.icone} size={24} />
      {e.court ?? e.libelle}
    </a>
  );

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <div className={s.app}>
        <header className={s.topbar}>
          <a href={nav.entrees[0].href} className={v.logo} aria-label={`XwézanEvent, ${nav.role.toLowerCase()}`}>
            <span className={v.logoX}>Xwézan</span>
          </a>
          <span className={s.role}>{nav.role}</span>
          <span style={{ display: "flex", gap: 4 }}>
            <a href={`${B}/compte`} className={s.iconeBtn} aria-label="Mes billets">
              <Icon name="ticket" size={20} />
            </a>
            <a href={B} className={s.iconeBtn} aria-label="Voir le site">
              <Icon name="eye" size={20} />
            </a>
          </span>
        </header>

        <aside className={s.lateral}>
          <a href={nav.entrees[0].href} className={v.logo} aria-label={`XwézanEvent, ${nav.role.toLowerCase()}`}>
            <span className={v.logoX}>Xwézan</span>
          </a>
          <p className={s.role}>{nav.role}</p>
          <nav aria-label="Navigation de l'espace" style={{ display: "grid", gap: 4 }}>
            {nav.entrees.map((e) => (
              <a key={e.cle} href={e.href} className={`${s.latLien} ${actif === e.cle ? s.latOn : ""}`} aria-current={actif === e.cle ? "page" : undefined}>
                <Icon name={e.icone} size={20} />
                {e.libelle}
              </a>
            ))}
          </nav>
          {creer && (
            <a href={creer.href} className={`${s.btn} ${s.btnOr} ${s.latCreer}`}>
              <Icon name={creer.icone} /> {creer.libelle}
            </a>
          )}
          <div className={s.latBas}>
            <a href={`${B}/compte`} className={s.latLien}>
              <Icon name="ticket" size={20} /> Mes billets
            </a>
            <a href={B} className={s.latLien}>
              <Icon name="eye" size={20} /> Voir le site
            </a>
            <a href="#" className={s.latLien}>
              <Icon name="logout" size={20} /> Se déconnecter
            </a>
            <div className={s.latCompte}>
              <span className={s.avatar} aria-hidden="true">
                {nav.compte.nom.charAt(0)}
              </span>
              <div>
                {nav.compte.nom}
                <span>{nav.compte.email}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className={s.principal}>{children}</main>

        <nav
          className={s.tabbar}
          aria-label="Navigation de l'espace"
          style={{ gridTemplateColumns: `repeat(${onglets.length + (creer ? 1 : 0)}, 1fr)` }}
        >
          {onglets.slice(0, moitie).map(tab)}
          {creer && (
            <a href={creer.href} className={s.tabCreer} aria-label={creer.libelle}>
              <span>
                <Icon name={creer.icone} size={24} />
              </span>
            </a>
          )}
          {onglets.slice(moitie).map(tab)}
        </nav>
      </div>
    </div>
  );
}

/** Liens pour relire les états forcés d'une page (retirés à l'intégration). */
export function RubanEtats({ chemin, etats = ["normal", "vide", "chargement"] }: { chemin: string; etats?: string[] }) {
  return (
    <p className={s.ruban}>
      <span>Preview, états :</span>
      {etats.map((e) => (
        <a key={e} href={e === "normal" ? chemin : `${chemin}?etat=${e}`}>
          {e}
        </a>
      ))}
    </p>
  );
}
