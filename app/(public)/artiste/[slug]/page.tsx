import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { RESEAUX, type CleReseau } from "@/lib/artistes";
import { getDatesArtiste } from "@/lib/events";
import Icon from "@/components/v2/Icon";
import Carte from "@/components/v2/public/Carte";
import AbonnementArtiste, { AjouterDate, BoutonAbonner, CompteurAbonnes } from "@/components/v2/public/AbonnementArtiste";
import LogoReseau from "@/components/v2/public/LogoReseau";
import { Header, Footer } from "@/components/v2/public/Chrome";
import { versCarte } from "@/components/v2/public/carteData";
import { jour, mois } from "@/components/v2/public/evenement";
import { initialesArtiste } from "@/components/v2/orga/artistes/initiales";
import { POLICES_V2 } from "@/components/v2/polices";
import v from "@/components/v2/v2.module.css";

export const revalidate = 60;

interface ArtistePublic {
  id: string;
  slug: string;
  nom_scene: string;
  bio: string | null;
  photo_url: string | null;
  couverture_url: string | null;
  liens: Partial<Record<CleReseau, string>> | null;
  label_id: string | null;
  compte_id: string | null;
  cree_par: string | null;
}

const COLONNES = "id, slug, nom_scene, bio, photo_url, liens, label_id, compte_id, cree_par";

/** Artiste validé par son slug, ou null (en validation, refusé, inexistant). Lu une fois par requête. */
const lireArtiste = cache(async (slug: string): Promise<ArtistePublic | null> => {
  const lire = (colonnes: string) => supabaseAdmin.from("artistes").select(colonnes).eq("slug", slug).eq("statut", "valide").maybeSingle();
  let { data, error } = await lire(`${COLONNES}, couverture_url`);
  // Migration 20261008140000 (couverture_url) pas encore appliquée : la page reste servie, sans couverture.
  if (error?.code === "42703") ({ data, error } = await lire(COLONNES));
  if (!data) return null;
  return { couverture_url: null, ...(data as unknown as Omit<ArtistePublic, "couverture_url">) } as ArtistePublic;
});

/** Image servie par l'optimiseur de Next, largeur fixe (WebP), quelle que soit la densité de l'écran. */
const optimisee = (url: string, largeur: number) => `/_next/image?url=${encodeURIComponent(url)}&w=${largeur}&q=${largeur > 1000 ? 70 : 60}`;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await lireArtiste(params.slug);
  if (!a) return { title: "Artiste introuvable — XwézanEvent" };
  const description = a.bio?.trim().slice(0, 160) || `Les prochaines dates de ${a.nom_scene} sur XwézanEvent.`;
  return {
    title: `${a.nom_scene} — XwézanEvent`,
    description,
    openGraph: { title: a.nom_scene, description, ...(a.photo_url ? { images: [a.photo_url] } : {}) },
  };
}


/**
 * Page artiste (V2), reprise de la preview (v2/artiste) : design/ARTISTES.md.
 * 404 tant que l'artiste n'est pas validé. Badge « Vérifié » quand un compte
 * qui gère l'artiste (label, compte de l'artiste, créateur) est vérifié.
 * Refonte 2026-10-08 : bandeau de couverture pleine largeur, fond en
 * cascade (couverture nette → photo de profil floutée → dégradé) ;
 * « S'abonner » et réseaux (logos) sous la bande ; dates avant la bio.
 * « S'abonner » (lot 3) : e-mail à chaque nouvelle date (lib/abonnements.ts).
 */
export default async function PageArtiste({ params }: { params: { slug: string } }) {
  const a = await lireArtiste(params.slug);
  if (!a) notFound();

  const gestionnaires = Array.from(new Set([a.label_id, a.compte_id, a.cree_par].filter((x): x is string => !!x)));
  const [{ data: verifies }, { count: abonnes }, { aVenir, passees }] = await Promise.all([
    gestionnaires.length ? supabaseAdmin.from("comptes_verifies").select("user_id").in("user_id", gestionnaires) : Promise.resolve({ data: [] }),
    supabaseAdmin.from("abonnements").select("id", { count: "exact", head: true }).eq("artiste_id", a.id),
    getDatesArtiste(a.id),
  ]);
  const verifie = (verifies ?? []).length > 0;
  const reseaux = RESEAUX.filter((r) => a.liens?.[r.cle]).map((r) => ({ cle: r.cle, libelle: r.libelle, url: a.liens![r.cle]! }));
  // Fond du bandeau : couverture (nette) → photo de profil (floutée) → dégradé.
  const fond = a.couverture_url ?? a.photo_url;
  const bio = a.bio?.trim();

  return (
    <div className={`${POLICES_V2} ${v.racine}`}>
      <Header />
      <main>
        <div className={`${v.cont} ${v.artCont} ${v.artFil}`}>
          <nav className={v.fil} aria-label="Fil d'Ariane">
            <Link href="/evenements">Événements</Link>
            <Icon name="chevron-right" />
            <span>{a.nom_scene}</span>
          </nav>
        </div>

        {/* Compteur (bandeau) et bouton (sous le bandeau) partagent un même état, lu côté client : la page reste en cache. */}
        <AbonnementArtiste artisteId={a.id} slug={a.slug} abonnesInitial={abonnes ?? 0}>
          <section className={`${v.artBandeau} ${fond ? "" : v.artBandeauRepli}`}>
            {fond && (
              <div className={`${v.artFond} ${a.couverture_url ? v.artFondNet : ""}`} aria-hidden="true">
                {/* Largeur fixe : 640 px en mobile, 1 200 en bureau (1 920 pour une couverture nette). */}
                <picture>
                  <source media="(min-width: 768px)" srcSet={optimisee(fond, a.couverture_url ? 1920 : 1200)} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optimisee(fond, a.couverture_url ? 828 : 640)} alt="" fetchPriority="high" />
                </picture>
              </div>
            )}
            <div className={`${v.cont} ${v.artCont}`}>
              <div className={v.artTete}>
                <div className={v.artPhoto}>
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo_url} alt={`Photo : ${a.nom_scene}`} />
                  ) : (
                    <span aria-hidden="true">{initialesArtiste(a.nom_scene)}</span>
                  )}
                </div>
                {/* Identité : badge seul sur sa ligne, nom, nombre d'abonnés ; base alignée sur la vignette. */}
                <div className={v.artInfos}>
                  {verifie && (
                    <span className={v.badgeVerifie}>
                      <Icon name="check" /> Vérifié
                    </span>
                  )}
                  <h1 className={v.h1}>{a.nom_scene}</h1>
                  <CompteurAbonnes />
                </div>
              </div>
            </div>
          </section>

          {/* Sous la bande : « S'abonner », puis les réseaux à la ligne. */}
          <div className={`${v.cont} ${v.artCont} ${v.artSous}`}>
            <BoutonAbonner />
            {reseaux.length > 0 && (
              <div className={v.artLogos}>
                {reseaux.map((r) => (
                  <a key={r.cle} href={r.url} target="_blank" rel="noopener noreferrer" aria-label={r.libelle} title={r.libelle}>
                    <LogoReseau cle={r.cle} />
                  </a>
                ))}
              </div>
            )}
          </div>

        <div className={`${v.cont} ${v.artCont}`}>
          <section className={v.artSection} aria-labelledby="a-venir">
            <div className={`${v.tete} ${v.artTeteDates}`}>
              <h2 id="a-venir" className={v.h2}>
                Prochaines dates
              </h2>
              {/* Compte qui gère l'artiste ou admin seulement (état lu côté client). */}
              <AjouterDate />
            </div>
            {aVenir.length === 0 ? (
              <p className={v.artVide}>
                <Icon name="calendar" size={16} /> Aucune date annoncée pour l&apos;instant.
              </p>
            ) : (
              <div className={v.grille}>
                {aVenir.map((e) => (
                  <Carte key={e.id} e={versCarte(e)} s={v} href={e.href} />
                ))}
              </div>
            )}
          </section>

          {bio && (
            <section className={v.section} aria-labelledby="bio">
              <div className={v.tete}>
                <h2 id="bio" className={v.h2}>
                  À propos
                </h2>
              </div>
              <p className={v.artBio}>{bio}</p>
            </section>
          )}

          {passees.length > 0 && (
            <section className={v.section} aria-labelledby="passees">
              <div className={v.tete}>
                <h2 id="passees" className={v.h2}>
                  Dates passées
                </h2>
              </div>
              <ul className={v.artPassees}>
                {passees.map((p) => (
                  <li key={p.slug}>
                    <span className={v.artPasseeDate}>
                      {Number(jour(p.date))} {mois(p.date)} {p.date.slice(0, 4)}
                    </span>
                    <Link href={`/evenement/${p.slug}`} className={v.artPasseeTitre}>
                      {p.titre}
                    </Link>
                    <span className={v.artPasseeLieu}>
                      {p.lieu}, {p.ville}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        </AbonnementArtiste>
      </main>
      <Footer />
    </div>
  );
}
