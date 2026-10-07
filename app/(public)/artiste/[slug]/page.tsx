import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { RESEAUX, type CleReseau } from "@/lib/artistes";
import { getDatesArtiste } from "@/lib/events";
import Icon from "@/components/v2/Icon";
import Carte from "@/components/v2/public/Carte";
import AbonnementArtiste from "@/components/v2/public/AbonnementArtiste";
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
  liens: Partial<Record<CleReseau, string>> | null;
  label_id: string | null;
  compte_id: string | null;
  cree_par: string | null;
}

/** Artiste validé par son slug, ou null (en validation, refusé, inexistant). Lu une fois par requête. */
const lireArtiste = cache(async (slug: string): Promise<ArtistePublic | null> => {
  const { data } = await supabaseAdmin
    .from("artistes")
    .select("id, slug, nom_scene, bio, photo_url, liens, label_id, compte_id, cree_par")
    .eq("slug", slug)
    .eq("statut", "valide")
    .maybeSingle();
  return (data as ArtistePublic | null) ?? null;
});

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
 * qui gère l'artiste (label, compte de l'artiste, créateur) est vérifié ;
 * label relié au compte organisateur du label. « S'abonner » (lot 3) :
 * e-mail à chaque nouvelle date (lib/abonnements.ts).
 */
export default async function PageArtiste({ params }: { params: { slug: string } }) {
  const a = await lireArtiste(params.slug);
  if (!a) notFound();

  const gestionnaires = Array.from(new Set([a.label_id, a.compte_id, a.cree_par].filter((x): x is string => !!x)));
  const [{ data: verifies }, { data: label }, { count: abonnes }, { aVenir, passees }] = await Promise.all([
    gestionnaires.length ? supabaseAdmin.from("comptes_verifies").select("user_id").in("user_id", gestionnaires) : Promise.resolve({ data: [] }),
    a.label_id ? supabaseAdmin.from("profiles").select("nom, nom_public").eq("id", a.label_id).maybeSingle() : Promise.resolve({ data: null }),
    supabaseAdmin.from("abonnements").select("id", { count: "exact", head: true }).eq("artiste_id", a.id),
    getDatesArtiste(a.id),
  ]);
  const verifie = (verifies ?? []).length > 0;
  const nomLabel = label ? label.nom_public || label.nom : null;
  const nbAbonnes = abonnes ?? 0;
  const reseaux = RESEAUX.filter((r) => a.liens?.[r.cle]).map((r) => ({ libelle: r.libelle, url: a.liens![r.cle]! }));

  return (
    <div className={`${POLICES_V2} ${v.racine}`}>
      <Header />
      <main className={v.cont}>
        <nav className={v.fil} aria-label="Fil d'Ariane">
          <Link href="/evenements">Événements</Link>
          <Icon name="chevron-right" />
          <span>{a.nom_scene}</span>
        </nav>

        <section className={v.artTete}>
          <div className={v.artPhoto}>
            {a.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo_url} alt={`Photo : ${a.nom_scene}`} />
            ) : (
              <span aria-hidden="true">{initialesArtiste(a.nom_scene)}</span>
            )}
          </div>
          <div className={v.artInfos}>
            <h1 className={v.h1}>
              {a.nom_scene}
              {verifie && (
                <span className={v.badgeVerifie}>
                  <Icon name="check" /> Vérifié
                </span>
              )}
            </h1>
            {/* Compteur et « S'abonner » : état du visiteur lu côté client, la page reste en cache. */}
            <AbonnementArtiste artisteId={a.id} slug={a.slug} nom={a.nom_scene} nomLabel={nomLabel} abonnesInitial={nbAbonnes} />
            {reseaux.length > 0 && (
              <div className={v.artReseaux}>
                {reseaux.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer">
                    <Icon name="link" /> {r.libelle}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>

        {a.bio?.trim() && <p className={v.artBio}>{a.bio.trim()}</p>}

        <section className={v.section} aria-labelledby="a-venir">
          <div className={v.tete}>
            <h2 id="a-venir" className={v.h2}>
              Prochaines dates
            </h2>
          </div>
          {aVenir.length === 0 ? (
            <div className={v.vide}>
              <Icon name="calendar" size={32} className={v.videIco} />
              <h3 className={v.videTitre}>Aucune date annoncée pour l&apos;instant</h3>
              <p className={v.videTexte}>Les prochains concerts de {a.nom_scene} apparaîtront ici dès qu&apos;ils seront en vente.</p>
            </div>
          ) : (
            <div className={v.grille}>
              {aVenir.map((e) => (
                <Carte key={e.id} e={versCarte(e)} s={v} href={e.href} />
              ))}
            </div>
          )}
        </section>

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
      </main>
      <Footer />
    </div>
  );
}
