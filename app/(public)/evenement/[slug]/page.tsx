import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Icon from "@/components/v2/Icon";
import Reveal from "@/components/v2/Reveal";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Galerie from "@/components/v2/public/Galerie";
import BilletPicker from "@/components/v2/public/BilletPicker";
import { dateLongue } from "@/components/v2/public/evenement";
import { POLICES_V2 } from "@/components/v2/polices";
import s from "@/components/v2/v2.module.css";
import { getEvenementParSlug } from "@/lib/events";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) return { title: "Événement introuvable — XwézanEvent" };
  return {
    title: `${ev.titre} — XwézanEvent`,
    description: ev.description ?? `${ev.titre} · ${ev.lieu}, ${ev.ville}`,
  };
}

/**
 * Page événement (V2), reprise de la preview (v2/evenement). Galerie
 * (affiche + visuels secondaires, visionneuse plein écran), infos, puis
 * sélecteur de billets qui mène à /evenement/[slug]/commande. Événement
 * de démonstration ou terminé : pas de sélecteur, un encadré à la place.
 */
export default async function EvenementDetail({ params }: { params: { slug: string } }) {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) notFound();

  const heure = ev.heure ? ev.heure.slice(0, 5) : null;
  const lieu = `${ev.lieu}, ${ev.ville}`;
  const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieu)}`;
  // Affiche principale en premier, puis les autres visuels dans leur ordre.
  const images = ev.images.length
    ? [...ev.images.filter((i) => i.principale), ...ev.images.filter((i) => !i.principale)].map((i) => i.url)
    : ev.affiche_url
      ? [ev.affiche_url]
      : [];
  const paragraphes = (ev.description ?? "").split(/\r?\n/).map((p) => p.trim()).filter(Boolean);
  const ferme = ev.estDemo || ev.estTermine;

  return (
    <div className={`${POLICES_V2} ${s.racine}`}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/evenements">Événements</a>
          <Icon name="chevron-right" />
          <span>{ev.ville}</span>
        </nav>

        <div className={s.detailGrille}>
          <div>
            <Galerie images={images} titre={ev.titre} categorie={ev.categories[0] ?? "Événement"} s={s} />
            <h1 className={s.dTitre}>{ev.titre}</h1>
            <p className={s.dQuand}>
              <Icon name="calendar" size={20} />
              {dateLongue({ debut: ev.date_debut, fin: ev.date_fin && ev.date_fin !== ev.date_debut ? ev.date_fin : undefined })}
            </p>
            <div className={s.puces}>
              <a className={s.puce} href={itineraire} target="_blank" rel="noopener noreferrer" aria-label={`${lieu} : itinéraire dans Google Maps`}>
                <Icon name="pin" /> {lieu}
              </a>
              {heure && (
                <span className={s.puce}>
                  <Icon name="clock" /> {heure}
                </span>
              )}
              <span className={s.puce}>
                <Icon name="phone" /> Mobile Money
              </span>
              <span className={s.puce}>
                <Icon name="qr" /> Billet QR
              </span>
            </div>

            {(paragraphes.length > 0 || ev.categories.length > 0 || ev.organisateurNom) && (
              <Reveal>
                <section className={s.section} style={{ paddingTop: 48 }}>
                  <div className={s.tete}>
                    <h2 className={s.h2}>À propos</h2>
                  </div>
                  {paragraphes.map((p, i) => (
                    <p key={i} className={s.texte} style={i > 0 ? { marginTop: 16 } : undefined}>
                      {p}
                    </p>
                  ))}
                  {ev.categories.length > 0 && (
                    <div className={s.puces} style={{ marginTop: 16 }}>
                      {ev.categories.map((t) => (
                        <span key={t} className={s.tag}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {ev.organisateurNom && (
                    <p className={s.discret} style={{ marginTop: 24 }}>
                      Organisé par {ev.organisateurNom} · {lieu}
                    </p>
                  )}
                </section>
              </Reveal>
            )}
          </div>

          <aside className={s.colAchat}>
            <section className={s.section} style={{ paddingTop: 32 }}>
              <div className={s.tete}>
                <h2 className={s.h2}>{ferme ? (ev.estTermine ? "Événement terminé" : "Démonstration") : "Billets"}</h2>
              </div>
              {ferme ? (
                <>
                  <p className={s.texte}>
                    {ev.estTermine
                      ? "Cet événement est passé : la billetterie est fermée."
                      : "Cet événement sert de vitrine pour présenter la plateforme : la billetterie n'est pas activée, aucun billet n'est en vente."}
                  </p>
                  <a className={s.cta} href="/evenements" style={{ marginTop: 24 }}>
                    <Icon name="calendar" size={20} />
                    Voir les événements à venir
                  </a>
                </>
              ) : (
                <BilletPicker tarifs={ev.ticketTypes} s={s} commande={`/evenement/${ev.slug}/commande`} titre={ev.titre} />
              )}
            </section>
          </aside>
        </div>
        {!ferme && <div className={s.espaceBarre} />}
      </main>
      <Footer />
    </div>
  );
}
