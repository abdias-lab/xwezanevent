import Link from "next/link";
import { creerClientServeur } from "@/lib/supabase-server";
import v from "../v2.module.css";
import Icon from "../Icon";

/** Slogan du pied de page, repris de la preview (preview-design/_data.ts). */
const SLOGAN = "Mì wá djawá !";

/** Compte connecté : le bouton « Se connecter » mène à l'espace du rôle (validé le 2026-09-28). */
const ESPACES: Record<string, { libelle: string; href: string }> = {
  visiteur: { libelle: "Mon compte", href: "/compte" },
  organisateur: { libelle: "Mon espace", href: "/orga" },
  admin: { libelle: "Admin", href: "/admin" },
};

/**
 * En-tête public V2, repris de la preview (v2/chrome.tsx). Server Component :
 * lit la session pour choisir le bouton de droite. La recherche envoie sur
 * /evenements?q=, comme le catalogue.
 */
export async function Header() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let espace = { libelle: "Se connecter", href: "/connexion" };
  if (user) {
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    espace = ESPACES[profil?.role ?? "visiteur"] ?? ESPACES.visiteur;
  }

  return (
    <header className={v.header}>
      <div className={`${v.cont} ${v.nav}`}>
        <Link href="/" className={v.logo} aria-label="XwézanEvent, accueil">
          <span className={v.logoX}>Xwézan</span>
        </Link>
        <nav className={v.navLiens} aria-label="Navigation principale">
          <Link href="/evenements">Événements</Link>
          <Link href="/tarifs">Tarifs</Link>
        </nav>
        {/* Action organisateur : bouton distinct des liens de navigation (comme « Publier » en prod). */}
        <Link href="/creer" aria-label="Publier un événement" className={v.btnPublier}>
          <Icon name="plus" size={16} />
          <span>
            Publier<span className={v.libelleLong}> un événement</span>
          </span>
        </Link>
        <Link href={espace.href} className={v.btnBlanc}>
          {espace.libelle}
        </Link>
        <form className={v.pilule} role="search" action="/evenements">
          <Icon name="search" size={20} />
          <input type="search" name="q" placeholder="Artiste, lieu, ville" aria-label="Rechercher un événement" />
        </form>
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
