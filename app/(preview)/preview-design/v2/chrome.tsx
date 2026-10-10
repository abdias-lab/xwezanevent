import s from "./v2.module.css";
import Icon from "../Icon";
import { SLOGAN } from "../_data";

/** Compte connecté : le bouton « Se connecter » mène à l'espace du rôle. */
export type RoleConnecte = "visiteur" | "organisateur" | "admin";
const ESPACES: Record<RoleConnecte, { libelle: string; href: string }> = {
  visiteur: { libelle: "Mon compte", href: "/preview-design/v2/compte" },
  organisateur: { libelle: "Mon espace", href: "/preview-design/v2/orga" },
  admin: { libelle: "Admin", href: "/preview-design/v2/admin" },
};

export function Header({ connecte }: { connecte?: RoleConnecte }) {
  const espace = connecte ? ESPACES[connecte] : { libelle: "Se connecter", href: "/preview-design/v2/connexion" };
  return (
    <header className={s.header}>
      <div className={`${s.cont} ${s.nav}`}>
        <a href="/preview-design/v2" className={s.logo} aria-label="XwézanEvent, accueil">
          <span className={s.logoX}>Xwézan</span>
        </a>
        <form className={s.pilule} role="search" action="/preview-design/v2/evenements">
          <Icon name="search" size={20} />
          <input type="search" name="q" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
        </form>
        {/* Plus de « Publier » dans l'en-tête (2026-10-08) : accueil, pied de page et espace organisateur. */}
        <a href={espace.href} className={s.btnBlanc}>
          {espace.libelle}
        </a>
      </div>
    </header>
  );
}

/**
 * Pied de page en colonnes. Colonne Organisateurs selon le rôle (passer le
 * même `connecte` qu'au Header) : « Publier » sans session, « Devenir
 * organisateur » pour un acheteur, « Publier » + « Scanner un billet » pour
 * un organisateur ou un admin. Réseaux avec le slogan.
 */
export function Footer({ connecte }: { connecte?: RoleConnecte }) {
  const B = "/preview-design/v2";
  const colonnes: { titre: string; liens: [string, string][] }[] = [
    { titre: "Découvrir", liens: [["Événements", `${B}/evenements`], ["FAQ", `${B}/faq`]] },
    {
      titre: "Organisateurs",
      liens: [
        [connecte === "visiteur" ? "Devenir organisateur" : "Publier un événement", `${B}/creer`],
        ["Tarifs", `${B}/tarifs`],
        ["Reversements", `${B}/reversements`],
        ...(connecte === "organisateur" || connecte === "admin" ? ([["Scanner un billet", `${B}/scan`]] as [string, string][]) : []),
      ],
    },
    { titre: "Aide", liens: [["Contact", `${B}/contact`], ["Remboursements", `${B}/remboursements`], ["CGU", `${B}/cgu`]] },
  ];
  return (
    <footer className={s.footer}>
      <div className={`${s.cont} ${s.footerCorps}`}>
        <nav className={s.footerColonnes} aria-label="Pied de page">
          {colonnes.map((c) => (
            <div key={c.titre} className={s.footerColonne}>
              <h2 className={s.footerTitre}>{c.titre}</h2>
              <ul>
                {c.liens.map(([libelle, href]) => (
                  <li key={href}>
                    <a href={href}>{libelle}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.footerBas}>
          <div className={s.footerSignature}>
            <div className={s.slogan}>{SLOGAN}</div>
            <div className={s.footerReseaux}>
              <a href="https://instagram.com/xwezan_event" target="_blank" rel="noopener noreferrer" aria-label="XwézanEvent sur Instagram" title="XwézanEvent sur Instagram">
                <Icon name="instagram" size={20} />
              </a>
              <a href="https://wa.me/22953064872" target="_blank" rel="noopener noreferrer" aria-label="XwézanEvent sur WhatsApp" title="XwézanEvent sur WhatsApp">
                <Icon name="whatsapp" size={20} />
              </a>
            </div>
          </div>
          <div>© Xwézan · Billetterie du Bénin</div>
        </div>
      </div>
    </footer>
  );
}
