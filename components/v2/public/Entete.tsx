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
 * recherche et bouton de l'espace. Plus de « Publier un événement » ici
 * (décision d'Abdias du 2026-10-08 : trop de place dans la barre) ; il reste
 * sous le sous-titre de l'accueil, dans le pied de page et dans l'espace
 * organisateur. Sans accès à la session : utilisable côté serveur (Chrome.tsx)
 * comme côté client (EnteteClient.tsx, pour app/error.tsx). La recherche
 * envoie sur /evenements?q=.
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

/** Rôle lu dans profiles.role ; null pour un visiteur non connecté. */
export type RolePied = "visiteur" | "organisateur" | "admin" | null;

/** Organisateur ou admin : scanner, espace organisateur. */
export const estOrganisateur = (role: RolePied) => role === "organisateur" || role === "admin";

/** Réseaux de XwézanEvent (repris de l'ancien pied de page). */
export const RESEAUX: { libelle: string; href: string; icone: "instagram" | "whatsapp" }[] = [
  { libelle: "XwézanEvent sur Instagram", href: "https://instagram.com/xwezan_event", icone: "instagram" },
  { libelle: "XwézanEvent sur WhatsApp", href: "https://wa.me/22953064872", icone: "whatsapp" },
];

/**
 * Pied de page public V2, repris de la preview (v2/chrome.tsx) : trois
 * colonnes avec intitulés (Découvrir, Organisateurs, Aide), empilées sur
 * mobile, puis le slogan, les réseaux et le copyright. Colonne
 * Organisateurs selon le rôle : « Publier un événement » pour un visiteur
 * non connecté, « Devenir organisateur » pour un acheteur, « Publier » et
 * « Scanner un billet » pour un organisateur ou un admin (/scan leur est
 * réservé). Sans accès à la session : le rôle est lu par Footer (Chrome.tsx,
 * serveur) ou FooterClient (EnteteClient.tsx, pages d'erreur client).
 */
export function PiedDePage({ role }: { role: RolePied }) {
  const colonnes: { titre: string; liens: { libelle: string; href: string }[] }[] = [
    {
      titre: "Découvrir",
      liens: [
        { libelle: "Événements", href: "/evenements" },
        { libelle: "FAQ", href: "/faq" },
      ],
    },
    {
      titre: "Organisateurs",
      liens: [
        { libelle: role === "visiteur" ? "Devenir organisateur" : "Publier un événement", href: "/creer" },
        { libelle: "Tarifs", href: "/tarifs" },
        { libelle: "Reversements", href: "/reversements" },
        ...(estOrganisateur(role) ? [{ libelle: "Scanner un billet", href: "/scan" }] : []),
      ],
    },
    {
      titre: "Aide",
      liens: [
        { libelle: "Contact", href: "/contact" },
        { libelle: "Remboursements", href: "/remboursements" },
        { libelle: "CGU", href: "/cgu" },
      ],
    },
  ];
  return (
    <footer className={v.footer}>
      <div className={`${v.cont} ${v.footerCorps}`}>
        <nav className={v.footerColonnes} aria-label="Pied de page">
          {colonnes.map((c) => (
            <div key={c.titre} className={v.footerColonne}>
              <h2 className={v.footerTitre}>{c.titre}</h2>
              <ul>
                {c.liens.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.libelle}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={v.footerBas}>
          <div className={v.footerSignature}>
            <div className={v.slogan}>{SLOGAN}</div>
            <div className={v.footerReseaux}>
              {RESEAUX.map((r) => (
                <a key={r.href} href={r.href} target="_blank" rel="noopener noreferrer" aria-label={r.libelle} title={r.libelle}>
                  <Icon name={r.icone} size={20} />
                </a>
              ))}
            </div>
          </div>
          <div>© Xwézan · Billetterie du Bénin</div>
        </div>
      </div>
    </footer>
  );
}
