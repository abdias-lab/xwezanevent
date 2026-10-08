import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Icon from "@/components/v2/Icon";
import Reveal from "@/components/v2/Reveal";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Galerie from "@/components/v2/public/Galerie";
import BilletPicker from "@/components/v2/public/BilletPicker";
import Partager from "@/components/v2/public/Partager";
import { dateLongue } from "@/components/v2/public/evenement";
import { POLICES_V2 } from "@/components/v2/polices";
import s from "@/components/v2/v2.module.css";
import { getArtistesEvenement, getEvenementParSlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { initialesArtiste } from "@/components/v2/orga/artistes/initiales";
import { listeOperateursCourt, operateursPays } from "@/lib/telephone";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) return { title: "Événement introuvable — XwézanEvent" };
  return {
    title: `${ev.titre} — XwézanEvent`,
    description: ev.description ?? `${ev.titre} · ${ev.lieu}, ${ev.ville}`,
  };
}

/** Initiales (1 ou 2 lettres) de l'avatar organisateur : « Bénin Live Events » → « BL ». */
function initialesOrga(nom: string) {
  return nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");
}

/** Opérateurs acceptés, nommés : « MTN, Moov & Celtiis Money » (un acheteur veut savoir si le sien est accepté). */
function paiementAccepte(pays: string) {
  if (pays !== "bj") return `Mobile Money : ${listeOperateursCourt(pays)}`;
  const noms = operateursPays(pays).map((o) => o.nomCourt);
  return `${noms.slice(0, -1).join(", ")} & ${noms[noms.length - 1]} Money`;
}

/**
 * Page événement (V2), reprise de la preview (v2/evenement). Bureau : infos
 * à gauche (titre, organisateur, date et heure, lieu, paiement, actions),
 * affiche 16:9 à droite ; puis, en pleine largeur et dans cet ordre :
 * billets, description, organisateur, catégories, localisation. Mobile :
 * empilé, l'affiche d'abord, les billets juste après les infos.
 * Événement de démonstration ou terminé : pas de sélecteur de billets, un
 * encadré à la place.
 */
export default async function EvenementDetail({ params }: { params: { slug: string } }) {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) notFound();

  // « Avec » et badge « Vérifié » (design/ARTISTES.md). Artiste auto-produit :
  // l'organisateur est le compte de l'artiste, « Organisé par » est masqué.
  const [artistes, { data: orgaVerifieLigne }] = await Promise.all([
    getArtistesEvenement(ev.id),
    supabaseAdmin.from("comptes_verifies").select("user_id").eq("user_id", ev.organisateurId).maybeSingle(),
  ]);
  const orgaVerifie = !!orgaVerifieLigne;
  const afficherOrga = !!ev.organisateurNom && !artistes.some((a) => a.compteId === ev.organisateurId);

  const heure = ev.heure ? ev.heure.slice(0, 5) : null;
  const lieu = `${ev.lieu}, ${ev.ville}`;
  const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lieu)}`;
  // Affiche principale en premier, puis les autres visuels dans leur ordre.
  const images = ev.images.length
    ? [...ev.images.filter((i) => i.principale), ...ev.images.filter((i) => !i.principale)].map((i) => i.url)
    : ev.affiche_url
      ? [ev.affiche_url]
      : [];
  // Description telle que saisie : une ligne vide sépare deux paragraphes, un
  // simple retour à la ligne reste un retour à la ligne (.texteLibre).
  const paragraphes = (ev.description ?? "")
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) =>
      p
        .split("\n")
        .map((l) => l.trim())
        .join("\n")
        .trim(),
    )
    .filter(Boolean);
  const ferme = ev.estDemo || ev.estTermine;
  const date = dateLongue({ debut: ev.date_debut, fin: ev.date_fin && ev.date_fin !== ev.date_debut ? ev.date_fin : undefined });

  return (
    <div className={`${POLICES_V2} ${s.racine}`}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/evenements">Événements</a>
          <Icon name="chevron-right" />
          <span>{ev.ville}</span>
        </nav>

        <div className={s.evTete}>
          <div className={s.evInfos}>
            <h1 className={s.dTitre}>{ev.titre}</h1>
            {artistes.length > 0 && (
              <div className={s.evAvec}>
                <span className={s.evAvecLibelle}>Avec</span>
                {artistes.map((a) => {
                  const contenu = (
                    <>
                      <span className={s.avecAvatar} aria-hidden="true">
                        {a.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.photo} alt="" />
                        ) : (
                          initialesArtiste(a.nom)
                        )}
                      </span>
                      {a.nom}
                    </>
                  );
                  return a.slug ? (
                    <a key={a.nom} href={`/artiste/${a.slug}`} className={s.avecArtiste}>
                      {contenu}
                    </a>
                  ) : (
                    <span key={a.nom} className={s.avecArtiste}>
                      {contenu}
                    </span>
                  );
                })}
              </div>
            )}
            {afficherOrga && (
              <p className={s.evOrga}>
                Organisé par <b>{ev.organisateurNom}</b>
                {orgaVerifie && (
                  <span className={`${s.badgeVerifie} ${s.badgeVerifiePetit}`}>
                    <Icon name="check" /> Vérifié
                  </span>
                )}
              </p>
            )}
            <ul className={s.evListe}>
              <li className={s.evLigne}>
                <Icon name="calendar" size={20} />
                <span>{heure ? `${date} · ${heure}` : date}</span>
              </li>
              <li className={s.evLigne}>
                <Icon name="pin" size={20} />
                <a href={itineraire} target="_blank" rel="noopener noreferrer" aria-label={`${lieu} : itinéraire dans Google Maps`}>
                  {lieu}
                </a>
              </li>
              <li className={s.evLigne}>
                <Icon name="phone" size={20} />
                <span>{paiementAccepte(ev.paysCode)}</span>
              </li>
            </ul>
            <div className={s.evActions}>
              {!ferme && ev.ticketTypes.length > 0 && (
                <a href="#billets" className={`${s.btnBlanc} ${s.btnGrand}`}>
                  <Icon name="ticket" /> Réserver mes billets
                </a>
              )}
              <Partager titre={ev.titre} className={`${s.btnSec} ${s.btnGrand}`} />
            </div>
          </div>
          <div className={s.evVisuel}>
            <Galerie images={images} titre={ev.titre} categorie={ev.categories[0] ?? "Événement"} s={s} />
          </div>
        </div>

        <section id="billets" className={`${s.evSection} ${s.evBillets}`} style={{ scrollMarginTop: 96 }}>
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
            <BilletPicker tarifs={ev.ticketTypes} s={s} commande={`/evenement/${ev.slug}/commande`} />
          )}
        </section>

        {paragraphes.length > 0 && (
          <Reveal>
            <section className={s.evSection}>
              <div className={s.tete}>
                <h2 className={s.h2}>Description</h2>
              </div>
              {paragraphes.map((p, i) => (
                <p key={i} className={`${s.texte} ${s.texteLibre}`} style={i > 0 ? { marginTop: 16 } : undefined}>
                  {p}
                </p>
              ))}
            </section>
          </Reveal>
        )}

        {afficherOrga && ev.organisateurNom && (
          <Reveal>
            <section className={s.evSection}>
              <div className={s.tete}>
                <h2 className={s.h2}>Organisateur</h2>
              </div>
              <div className={s.evOrganisateur}>
                <span className={s.evAvatar} aria-hidden="true">
                  {initialesOrga(ev.organisateurNom)}
                </span>
                <b>{ev.organisateurNom}</b>
                {orgaVerifie && (
                  <span className={`${s.badgeVerifie} ${s.badgeVerifiePetit}`}>
                    <Icon name="check" /> Vérifié
                  </span>
                )}
              </div>
            </section>
          </Reveal>
        )}

        {ev.categories.length > 0 && (
          <Reveal>
            <section className={s.evSection}>
              <div className={s.tete}>
                <h2 className={s.h2}>Catégories</h2>
              </div>
              <div className={s.puces} style={{ marginTop: 0 }}>
                {ev.categories.map((t) => (
                  <span key={t} className={s.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <Reveal>
          <section className={s.evSection}>
            <div className={s.tete}>
              <h2 className={s.h2}>Localisation</h2>
            </div>
            <p className={s.texte}>
              <b style={{ color: "#fff" }}>{ev.lieu}</b>
              <br />
              {ev.ville}
            </p>
            <a className={s.puce} href={itineraire} target="_blank" rel="noopener noreferrer" style={{ marginTop: 16 }}>
              <Icon name="pin" /> Ouvrir dans Google Maps
            </a>
          </section>
        </Reveal>
        {!ferme && <div className={s.espaceBarre} />}
      </main>
      <Footer />
    </div>
  );
}
