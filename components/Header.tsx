import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import MenuBurger from "@/components/MenuBurger";

/**
 * En-tête sticky avec logo XwézanEvent (marque losange doré),
 * navigation principale et actions (connexion / compte / publier).
 * Server Component : lit l'utilisateur connecté via la session Supabase.
 */
export default async function Header() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

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
          {user ? (
            <>
              {role === "admin" && (
                <Link className="connexion" href="/admin">
                  Dashboard admin
                </Link>
              )}
              {role === "organisateur" && (
                <Link className="connexion" href="/orga">
                  Mon espace orga
                </Link>
              )}
              <Link className="connexion" href="/compte">
                Mon compte
              </Link>
              <BoutonDeconnexion />
            </>
          ) : (
            <Link className="connexion" href="/connexion">
              Se connecter
            </Link>
          )}
          <Link className="btn btn-or cta-header" href="/creer">
            <span className="cta-long">Publier un événement</span>
            <span className="cta-court">Publier</span>
          </Link>
        </div>

        <MenuBurger connecte={!!user} role={role} />
      </div>
    </header>
  );
}
