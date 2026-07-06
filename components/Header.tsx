import Link from "next/link";

/**
 * En-tête sticky avec logo XwézanEvent (marque losange doré),
 * navigation principale et actions (connexion / publier).
 */
export default function Header() {
  return (
    <header className="header">
      <div className="nav">
        <Link href="/" className="logo" aria-label="XwézanEvent — accueil">
          <span className="mark" aria-hidden="true" />
          Xwézan<em>Event</em>
        </Link>

        <nav className="nav-links" aria-label="Navigation principale">
          <Link href="/evenements">Événements</Link>
          <Link href="/#categories">Catégories</Link>
          <Link href="/#villes">Villes</Link>
        </nav>

        <div className="nav-right">
          <Link className="connexion" href="/connexion">
            Se connecter
          </Link>
          <Link className="btn btn-or" href="/creer">
            Publier un événement
          </Link>
        </div>
      </div>
    </header>
  );
}
