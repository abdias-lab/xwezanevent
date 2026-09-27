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
          <a href="#">Événements</a>
          <a href="#">Tarifs</a>
          <a href="#">Organisateurs</a>
        </nav>
        <a href="#" className={s.btnBlanc}>
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
          <a href="#">FAQ</a>
          <a href="#">Remboursements</a>
          <a href="#">CGU</a>
          <a href="mailto:contact@xwezan.com">Contact</a>
        </div>
        <div>© Xwézan · Billetterie du Bénin</div>
      </div>
    </footer>
  );
}
