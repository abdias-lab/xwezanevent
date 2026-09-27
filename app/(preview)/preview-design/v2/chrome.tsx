import s from "./v2.module.css";
import Icon from "../Icon";
import { SLOGAN } from "../_data";

export function Header() {
  return (
    <header className={s.header}>
      <div className={`${s.cont} ${s.nav}`}>
        <a href="/preview-design/v2" className={s.logo} aria-label="XwézanEvent, accueil">
          <span className={s.logoX}>Xwézan</span>
        </a>
        <nav className={s.navLiens} aria-label="Navigation principale">
          <a href="/preview-design/v2/evenements">Événements</a>
          <a href="/preview-design/v2/tarifs">Tarifs</a>
        </nav>
        {/* Action organisateur : bouton distinct des liens de navigation (comme « Publier » en prod). */}
        <a href="/preview-design/v2/creer" className={s.btnPublier}>
          <Icon name="plus" size={16} />
          <span>
            Publier<span className={s.libelleLong}> un événement</span>
          </span>
        </a>
        <a href="/preview-design/v2/connexion" className={s.btnBlanc}>
          Se connecter
        </a>
        <form className={s.pilule} role="search">
          <Icon name="search" size={20} />
          <input type="search" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
        </form>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className={s.footer}>
      <div className={`${s.cont} ${s.footerCorps}`}>
        <div className={s.slogan}>{SLOGAN}</div>
        <div className={s.footerLiens}>
          <a href="/preview-design/v2/faq">FAQ</a>
          <a href="/preview-design/v2/remboursements">Remboursements</a>
          <a href="/preview-design/v2/cgu">CGU</a>
          <a href="mailto:contact@xwezan.com">Contact</a>
        </div>
        <div>© Xwézan · Billetterie du Bénin</div>
      </div>
    </footer>
  );
}
