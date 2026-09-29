import Link from "next/link";
import v from "../v2.module.css";
import Icon from "../Icon";

/** Slogan du pied de page, repris de la preview (preview-design/_data.ts). */
const SLOGAN = "Mì wá djawá !";

export type Espace = { libelle: string; href: string };

/** Bouton de droite de l'en-tête selon le rôle (validé le 2026-09-28). */
export const ESPACES: Record<string, Espace> = {
  visiteur: { libelle: "Mon compte", href: "/compte" },
  organisateur: { libelle: "Mon espace", href: "/orga" },
  admin: { libelle: "Admin", href: "/admin" },
};
export const SE_CONNECTER: Espace = { libelle: "Se connecter", href: "/connexion" };

/**
 * Dessin de l'en-tête public V2, repris de la preview (v2/chrome.tsx) : logo,
 * bouton de l'espace et recherche. « Événements », « Tarifs » et « Publier un
 * événement » sont dans le pied de page (décision du 2026-09-30). Sans
 * accès à la session : utilisable côté serveur (Chrome.tsx) comme côté client
 * (EnteteClient.tsx, pour app/error.tsx). La recherche envoie sur /evenements?q=.
 */
export function Entete({ espace }: { espace: Espace }) {
  return (
    <header className={v.header}>
      <div className={`${v.cont} ${v.nav}`}>
        <Link href="/" className={v.logo} aria-label="XwézanEvent, accueil">
          <span className={v.logoX}>Xwézan</span>
        </Link>
        <form className={v.pilule} role="search" action="/evenements">
          <Icon name="search" size={20} />
          <input type="search" name="q" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
        </form>
        <Link href={espace.href} className={v.btnBlanc}>
          {espace.libelle}
        </Link>
      </div>
    </header>
  );
}

/** Pied de page public V2, repris de la preview (v2/chrome.tsx). */
export function Footer() {
  return (
    <footer className={v.footer}>
      <div className={`${v.cont} ${v.footerCorps}`}>
        <div className={v.slogan}>{SLOGAN}</div>
        <div className={v.footerLiens}>
          <Link href="/evenements">Événements</Link>
          <Link href="/tarifs">Tarifs</Link>
          <Link href="/creer">Publier un événement</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/remboursements">Remboursements</Link>
          <Link href="/cgu">CGU</Link>
          <a href="mailto:contact@xwezan.com">Contact</a>
        </div>
        <div>© Xwézan · Billetterie du Bénin</div>
      </div>
    </footer>
  );
}
