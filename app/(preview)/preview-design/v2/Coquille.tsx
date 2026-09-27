import type { ReactNode } from "react";
import v from "./v2.module.css";
import s from "./espace.module.css";
import Icon, { type IconName } from "../Icon";

export const B = "/preview-design/v2";

export type EntreeNav = { cle: string; libelle: string; court?: string; href: string; icone: IconName };

/** Navigation de l'espace organisateur. `creer` est l'action centrale de la barre basse. */
export const NAV_ORGA: { entrees: EntreeNav[]; creer: EntreeNav; role: string; compte: { nom: string; email: string } } = {
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

type Nav = typeof NAV_ORGA;

/**
 * Coquille des espaces de travail : colonne latérale ≥ 1024 px,
 * barre supérieure + barre basse au pouce en dessous.
 */
export default function Coquille({ nav = NAV_ORGA, actif, children }: { nav?: Nav; actif: string; children: ReactNode }) {
  const [a, b, c, d] = nav.entrees;
  const tab = (e: EntreeNav) => (
    <a key={e.cle} href={e.href} className={`${s.tab} ${actif === e.cle ? s.tabOn : ""}`} aria-current={actif === e.cle ? "page" : undefined}>
      <Icon name={e.icone} size={24} />
      {e.court ?? e.libelle}
    </a>
  );

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <div className={s.app}>
        <header className={s.topbar}>
          <a href={nav.entrees[0].href} className={v.logo} aria-label="XwézanEvent, espace organisateur">
            <span className={v.logoX}>Xwézan</span>
          </a>
          <span className={s.role}>{nav.role}</span>
          <a href={B} className={s.iconeBtn} aria-label="Voir le site">
            <Icon name="eye" size={20} />
          </a>
        </header>

        <aside className={s.lateral}>
          <a href={nav.entrees[0].href} className={v.logo} aria-label="XwézanEvent, espace organisateur">
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
          <a href={nav.creer.href} className={`${s.btn} ${s.btnOr} ${s.latCreer}`}>
            <Icon name="plus" /> {nav.creer.libelle}
          </a>
          <div className={s.latBas}>
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

        <nav className={s.tabbar} aria-label="Navigation de l'espace">
          {tab(a)}
          {tab(b)}
          <a href={nav.creer.href} className={s.tabCreer} aria-label={nav.creer.libelle}>
            <span>
              <Icon name={nav.creer.icone} size={24} />
            </span>
          </a>
          {tab(c)}
          {tab(d)}
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
