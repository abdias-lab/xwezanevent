import s from "../v2.module.css";
import { Header, Footer } from "../chrome";
import Affiche from "../../Affiche";
import Galerie from "../../Galerie";
import BilletPicker from "../../BilletPicker";
import DetailSquelette from "../../DetailSquelette";
import Icon from "../../Icon";
import Partager from "../../Partager";
import Reveal from "../../Reveal";
import { RubanEtats } from "../Coquille";
import { EVENEMENTS, EVENEMENT_DETAIL, dateLongue } from "../../_data";
import { initialesArtiste } from "../orga/artistes/_artistes";

/**
 * « Avec » (design/ARTISTES.md) : artistes rattachés et acceptés. Validé :
 * lien vers sa page ; en attente de validation : texte simple, sans lien ;
 * refusé : absent.
 */
const ARTISTES: { nom: string; lien: string | null; photo: string | null }[] = [
  { nom: "Zeynab Habib", lien: "/preview-design/v2/artiste", photo: EVENEMENTS[4].image },
  { nom: "Kemi Sound", lien: null, photo: null },
];

/** Initiales (1 ou 2 lettres) de l'avatar organisateur : « Ouidah Live » → « OL ». */
const initialesOrga = (nom: string) =>
  nom
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Page événement (preview V2). Bureau : infos à gauche (titre, organisateur,
 * date et heure, lieu et ville en une ligne, paiement, actions), affiche 16:9 à droite ;
 * puis, en pleine largeur : billets, description, organisateur, catégories,
 * localisation. Mobile : tout empilé, l'affiche d'abord.
 */
export default function V2Detail({ searchParams }: { searchParams: { etat?: string; affiche?: string; images?: string } }) {
  const ev = searchParams.affiche === "non" ? { ...EVENEMENT_DETAIL, image: null } : EVENEMENT_DETAIL;
  const etat = searchParams.etat;
  const artistes = etat === "sans-artiste" ? [] : ARTISTES;
  // Artiste auto-produit : l'organisateur est le compte de l'artiste, « Organisé par » est masqué.
  const autoProduit = etat === "auto-produit";
  const orgaVerifie = etat !== "non-verifie";
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.lieu}, ${ev.ville}`)}`;

  return (
    <div className={s.racine}>
      <Header />
      <main className={s.cont}>
        <nav className={s.fil} aria-label="Fil d'Ariane">
          <a href="/preview-design/v2">Événements</a>
          <Icon name="chevron-right" />
          <span>{ev.ville}</span>
        </nav>

        {searchParams.etat === "chargement" ? (
          <DetailSquelette s={s} />
        ) : (
          <>
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
                      return a.lien ? (
                        <a key={a.nom} href={a.lien} className={s.avecArtiste}>
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
                {!autoProduit && (
                  <p className={s.evOrga}>
                    Organisé par <b>{ev.organisateur}</b>
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
                    <span>
                      {dateLongue(ev)} · {ev.heure}
                    </span>
                  </li>
                  <li className={s.evLigne}>
                    <Icon name="pin" size={20} />
                    <a href={maps} target="_blank" rel="noopener noreferrer" aria-label={`${ev.lieu}, ${ev.ville} : itinéraire dans Google Maps`}>
                      {ev.lieu}, {ev.ville}
                    </a>
                  </li>
                  <li className={s.evLigne}>
                    <Icon name="phone" size={20} />
                    <span>MTN, Moov &amp; Celtiis Money</span>
                  </li>
                </ul>
                <div className={s.evActions}>
                  <a href="#billets" className={`${s.btnBlanc} ${s.btnGrand}`}>
                    <Icon name="ticket" /> Réserver mes billets
                  </a>
                  <Partager titre={ev.titre} className={`${s.btnSec} ${s.btnGrand}`} />
                </div>
              </div>
              <div className={s.evVisuel}>
                {searchParams.images === "plusieurs" ? (
                  <Galerie images={[ev.image, EVENEMENTS[1].image, EVENEMENTS[4].image, EVENEMENTS[6].image].filter((x): x is string => !!x)} titre={ev.titre} categorie={ev.categorie} s={s} />
                ) : (
                  <Affiche e={ev} s={s} priorite />
                )}
              </div>
            </div>

            <section id="billets" className={`${s.evSection} ${s.evBillets}`} style={{ scrollMarginTop: 96 }}>
              <div className={s.tete}>
                <h2 className={s.h2}>Billets</h2>
              </div>
              <BilletPicker
                tarifs={
                  // ?etat=fin-de-vente (BUGS_REFONTE n°10) : une prévente close (grisée), un tarif avec sa date de fin.
                  etat === "fin-de-vente"
                    ? [
                        { id: "pre", nom: "Prévente", detail: "Vente terminée", prix: 3000, venteTerminee: true },
                        { ...ev.tarifs[0], detail: `En vente jusqu'au 10 nov. · ${ev.tarifs[0].detail}` },
                        ...ev.tarifs.slice(1),
                      ]
                    : ev.tarifs
                }
                s={s}
                commande="/preview-design/v2/commande"
              />
            </section>

            <Reveal>
              <section className={s.evSection}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Description</h2>
                </div>
                <p className={`${s.texte} ${s.texteLibre}`}>{ev.description}</p>
              </section>
            </Reveal>

            <Reveal>
              <section className={s.evSection}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Programme</h2>
                </div>
                <ol className={s.programme}>
                  {ev.programme.map((p) => (
                    <li key={p.jour}>
                      <span className={s.progJour}>{p.jour}</span>
                      <span>
                        {p.titre}
                        <span className={s.discret} style={{ display: "block" }}>
                          {p.heure}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>

            {!autoProduit && (
            <Reveal>
              <section className={s.evSection}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Organisateur</h2>
                </div>
                <div className={s.evOrganisateur}>
                  <span className={s.evAvatar} aria-hidden="true">
                    {initialesOrga(ev.organisateur)}
                  </span>
                  <b>{ev.organisateur}</b>
                  {orgaVerifie && (
                    <span className={`${s.badgeVerifie} ${s.badgeVerifiePetit}`}>
                      <Icon name="check" /> Vérifié
                    </span>
                  )}
                </div>
              </section>
            </Reveal>
            )}

            <Reveal>
              <section className={s.evSection}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Catégories</h2>
                </div>
                <div className={s.puces} style={{ marginTop: 0 }}>
                  {ev.tags.map((t) => (
                    <span key={t} className={s.tag}>
                      {t}
                    </span>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <section className={s.evSection}>
                <div className={s.tete}>
                  <h2 className={s.h2}>Localisation</h2>
                </div>
                <p className={s.texte}>
                  <b style={{ color: "#fff" }}>{ev.lieu}</b>
                  <br />
                  {ev.lieuAdresse}
                </p>
                <a className={s.puce} href={maps} target="_blank" rel="noopener noreferrer" style={{ marginTop: 16 }}>
                  <Icon name="pin" /> Ouvrir dans Google Maps
                </a>
              </section>
            </Reveal>
          </>
        )}
        <div className={s.espaceBarre} />
        <RubanEtats chemin="/preview-design/v2/evenement" etats={["normal", "sans-artiste", "auto-produit", "non-verifie", "fin-de-vente", "chargement"]} />
      </main>
      <Footer />
    </div>
  );
}
