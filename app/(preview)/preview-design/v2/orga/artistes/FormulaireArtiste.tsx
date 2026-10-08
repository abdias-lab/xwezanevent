"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { compresserImage } from "@/lib/compression-image";
import { RESEAUX, initialesArtiste, type ArtisteOrga, type TypeDemande } from "./_artistes";

const NOM_MAX = 80;
/** Couverture : format paysage du bandeau (1280 × 380 en bureau). */
const COUVERTURE_CONSEIL = "1920 × 600 px";
const COUVERTURE_LARGEUR_MIN = 1200;
const BIO_MAX = 2000;

/**
 * Formulaire artiste (preview V2, design/ARTISTES.md) : demande d'un nouvel
 * artiste ou modification. Compte non vérifié : message sur la vérification
 * et WhatsApp obligatoire (canal principal de l'équipe) ; un changement de
 * nom de scène passe en vérification, le nom actuel reste affiché. Compte
 * vérifié : publication immédiate. Aucun document demandé ici. Couverture
 * (2026-10-08) : même compression qu'en prod, image verticale ou carrée
 * refusée, aperçu du bandeau (ordinateur, téléphone). En prod :
 * components/v2/orga/artistes/FormulaireArtiste.tsx (action serveur).
 */
export default function FormulaireArtiste({
  artiste,
  verifie,
  peutMoiMeme,
}: {
  artiste?: ArtisteOrga;
  verifie: boolean;
  /** false si le compte a déjà sa propre page artiste (un seul compte par artiste). */
  peutMoiMeme: boolean;
}) {
  const nouveau = !artiste;
  const [type, setType] = useState<TypeDemande | null>(artiste?.type ?? (peutMoiMeme ? null : "label"));
  const [nom, setNom] = useState(artiste?.nomDemande ?? artiste?.nom ?? "");
  const [bio, setBio] = useState(artiste?.bio ?? "");
  const [photo, setPhoto] = useState<string | null>(artiste?.photo ?? null);
  const [couverture, setCouverture] = useState<string | null>(artiste?.couverture ?? null);
  const [preparationCouverture, setPreparationCouverture] = useState(false);
  const [erreurCouverture, setErreurCouverture] = useState<string | null>(null);
  const [avertCouverture, setAvertCouverture] = useState<string | null>(null);

  async function choisirCouverture(f: File | undefined) {
    if (!f) return;
    setErreurCouverture(null);
    setAvertCouverture(null);
    setPreparationCouverture(true);
    try {
      const fichier = await compresserImage(f);
      const apercu = URL.createObjectURL(fichier);
      const { largeur, hauteur } = await dimensions(apercu);
      if (largeur < hauteur * 1.5) {
        URL.revokeObjectURL(apercu);
        setErreurCouverture(
          `Cette image est ${largeur <= hauteur ? "verticale ou carrée" : "trop haute"} (${largeur} × ${hauteur} px). Le bandeau est en format paysage : choisis une image au moins 1,5 fois plus large que haute, idéalement ${COUVERTURE_CONSEIL}.`
        );
      } else {
        setCouverture(apercu);
        if (largeur < COUVERTURE_LARGEUR_MIN) setAvertCouverture(`Image étroite (${largeur} px de large) : elle risque d'être floue sur un grand écran.`);
      }
    } catch {
      setErreurCouverture("Cette image n'a pas pu être préparée. Essaie une autre image (JPG, PNG ou WebP).");
    }
    setPreparationCouverture(false);
  }
  const [tente, setTente] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const renomme = !nouveau && nom.trim() !== artiste.nom;

  if (envoye) {
    return (
      <div className={s.vide} role="status">
        <Icon name="check" size={32} />
        <p className={s.videTitre}>{nouveau ? (verifie ? "Page publiée" : "Demande envoyée") : "Modifications enregistrées"}</p>
        <p className={s.videTexte}>
          {nouveau && !verifie
            ? "L'équipe XwézanEvent te contacte par WhatsApp ou par e-mail pour finaliser la vérification. La page reste invisible du public d'ici là."
            : renomme && !verifie
              ? "Le nouveau nom de scène passe en vérification ; l'ancien reste affiché d'ici là."
              : "C'est en ligne."}
        </p>
      </div>
    );
  }

  return (
    <form
      style={{ display: "grid", gap: 16, maxWidth: 680 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTente(true);
        const ok = nom.trim() && type && (verifie || !nouveau || (e.currentTarget.elements.namedItem("whatsapp") as HTMLInputElement)?.value.trim());
        if (ok) setEnvoye(true);
      }}
    >
      <div style={{ display: "grid", gap: 16 }}>
        {nouveau && !verifie && (
          <p className={s.alerte} style={{ marginBottom: 0 }}>
            <Icon name="shield" />
            <span>
              <b>Chaque page artiste est vérifiée</b> : c&apos;est ce qui protège les artistes contre l&apos;usurpation de leur nom. Après ta demande,
              l&apos;équipe XwézanEvent te contacte par WhatsApp ou par e-mail pour la finaliser (statuts et mandat pour un label, pièce d&apos;identité
              et réseaux pour un artiste auto-produit). Rien à envoyer ici.
            </span>
          </p>
        )}
        {nouveau && verifie && (
          <p className={s.alerte} style={{ marginBottom: 0 }}>
            <Icon name="check" />
            <span>Ton compte est vérifié : la page sera publiée dès l&apos;enregistrement.</span>
          </p>
        )}

        {nouveau && (
          <section className={s.bloc} aria-labelledby="t-pour">
            <div className={s.blocTete}>
              <Icon name="users" size={20} />
              <h2 id="t-pour" className={s.blocTitre}>
                Pour qui ?
              </h2>
            </div>
            <div className={s.puces} role="group" aria-label="Pour qui">
              <button type="button" className={`${s.puce} ${type === "auto_produit" ? s.puceOn : ""}`} aria-pressed={type === "auto_produit"} disabled={!peutMoiMeme} onClick={() => setType("auto_produit")}>
                Moi-même, artiste auto-produit
              </button>
              <button type="button" className={`${s.puce} ${type === "label" ? s.puceOn : ""}`} aria-pressed={type === "label"} onClick={() => setType("label")}>
                Un artiste de mon label
              </button>
            </div>
            {!peutMoiMeme && <p className={s.aide}>Tu as déjà ta page artiste.</p>}
            {tente && !type && <span className={s.erreur}>Choisis pour qui est cette page.</span>}
          </section>
        )}

        <section className={s.bloc} aria-labelledby="t-artiste">
          <div className={s.blocTete}>
            <Icon name="eye" size={20} />
            <h2 id="t-artiste" className={s.blocTitre}>
              L&apos;artiste
            </h2>
          </div>
          <div className={`${s.champ} ${tente && !nom.trim() ? s.champErreur : ""}`}>
            <label htmlFor="nom">Nom de scène</label>
            <input id="nom" value={nom} maxLength={NOM_MAX} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Zeynab Habib" />
            {tente && !nom.trim() && <span className={s.erreur}>Indique le nom de scène.</span>}
            {!nouveau && !verifie && artiste.statut === "valide" && (
              <p className={s.aide}>
                {artiste.nomDemande
                  ? `« ${artiste.nomDemande} » est en vérification ; « ${artiste.nom} » reste affiché d'ici là.`
                  : "Un changement de nom passe par la vérification de l'équipe ; le nom actuel reste affiché d'ici là."}
              </p>
            )}
          </div>

          <div className={s.champ}>
            <span className={s.etiquette}>
              Photo <small>(facultative, format carré)</small>
            </span>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div className={s.avatarArtiste} aria-hidden="true">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" />
                ) : initialesArtiste(nom) ? (
                  <span>{initialesArtiste(nom)}</span>
                ) : (
                  <Icon name="image" size={20} />
                )}
              </div>
              <label className={`${s.btn} ${s.btnGris}`} style={{ cursor: "pointer" }}>
                <Icon name="upload" size={16} /> {photo ? "Changer" : "Ajouter une photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setPhoto(URL.createObjectURL(f));
                  }}
                />
              </label>
              {photo && (
                <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setPhoto(null)}>
                  Retirer
                </button>
              )}
            </div>
            <p className={s.aide}>Sans photo, la page affiche les initiales. JPG, PNG ou WebP.</p>
          </div>

          <div className={s.champ}>
            <span className={s.etiquette}>
              Image de couverture <small>(facultative, format paysage)</small>
            </span>
            <p className={s.aide} style={{ marginTop: 0 }}>
              Le grand bandeau en haut de la page artiste. Image <b>horizontale</b>, idéalement <b>{COUVERTURE_CONSEIL}</b> (au moins{" "}
              {COUVERTURE_LARGEUR_MIN} px de large) : une scène, un concert, une photo de presse. Le bas de l&apos;image passe sous le nom de
              l&apos;artiste. Sans couverture, la page utilise la photo, floutée.
            </p>
            {couverture && (
              <div className={s.apercuBandeaux}>
                <ApercuBandeau image={couverture} photo={photo} nom={nom} initiales={initialesArtiste(nom)} format="bureau" />
                <ApercuBandeau image={couverture} photo={photo} nom={nom} initiales={initialesArtiste(nom)} format="mobile" />
              </div>
            )}
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <label className={`${s.btn} ${s.btnGris}`} style={{ cursor: "pointer", position: "relative" }} aria-busy={preparationCouverture}>
                <Icon name="upload" size={16} /> {preparationCouverture ? "Préparation…" : couverture ? "Changer la couverture" : "Ajouter une couverture"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
                  onChange={(e) => {
                    choisirCouverture(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {couverture && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnGris}`}
                  onClick={() => {
                    setCouverture(null);
                    setAvertCouverture(null);
                  }}
                >
                  Retirer la couverture
                </button>
              )}
            </div>
            {erreurCouverture && <span className={s.erreur}>{erreurCouverture}</span>}
            {avertCouverture && <span className={s.aide}>{avertCouverture}</span>}
          </div>

          <div className={s.champ}>
            <label htmlFor="bio">
              Bio <small>(facultative)</small>
            </label>
            <textarea id="bio" value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value)} placeholder="Son style, son parcours, ses dernières sorties." />
            <p className={s.aide} style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {bio.length}/{BIO_MAX}
            </p>
          </div>
        </section>

        <section className={s.bloc} aria-labelledby="t-reseaux">
          <div className={s.blocTete}>
            <Icon name="link" size={20} />
            <h2 id="t-reseaux" className={s.blocTitre}>
              Réseaux <small style={{ fontWeight: 500, color: "var(--muted)" }}>(facultatifs)</small>
            </h2>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))" }}>
            {RESEAUX.map((r) => (
              <div key={r.cle} className={s.champ}>
                <label htmlFor={`r-${r.cle}`}>{r.libelle}</label>
                <input id={`r-${r.cle}`} type="url" inputMode="url" defaultValue={artiste?.liens[r.cle] ?? ""} placeholder={r.exemple} />
              </div>
            ))}
          </div>
        </section>

        {nouveau && !verifie && (
          <section className={s.bloc} aria-labelledby="t-contact">
            <div className={s.blocTete}>
              <Icon name="phone" size={20} />
              <h2 id="t-contact" className={s.blocTitre}>
                Pour te joindre
              </h2>
            </div>
            <div className={s.champ}>
              <label htmlFor="whatsapp">Numéro WhatsApp</label>
              <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="+229 01 97 12 34 56" />
              <p className={s.aide}>Avec l&apos;indicatif du pays. Visible seulement par l&apos;équipe XwézanEvent, pour la vérification.</p>
            </div>
          </section>
        )}
      </div>

      <div style={{ display: "grid", marginTop: 8 }}>
        <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
          {nouveau ? (verifie ? "Publier la page" : "Envoyer la demande") : artiste.statut === "refuse" ? "Corriger et renvoyer" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function dimensions(url: string): Promise<{ largeur: number; hauteur: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ largeur: img.naturalWidth, hauteur: img.naturalHeight });
    img.onerror = () => reject(new Error("image illisible"));
    img.src = url;
  });
}

/**
 * Aperçu du bandeau de la page artiste avec la couverture choisie, aux
 * proportions réelles (bureau 1280 × 380, téléphone 360 × 340) : montre le
 * recadrage et la partie de l'image qui passe sous le nom.
 */
function ApercuBandeau({
  image,
  photo,
  nom,
  initiales,
  format,
}: {
  image: string;
  photo: string | null;
  nom: string;
  initiales: string;
  format: "bureau" | "mobile";
}) {
  return (
    <figure className={`${s.apercuBandeau} ${format === "mobile" ? s.apercuBandeauMobile : ""}`}>
      <div className={s.apercuCadre}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" />
        <div className={s.apercuIdentite}>
          <span className={s.apercuAvatar} aria-hidden="true">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" />
            ) : (
              initiales
            )}
          </span>
          <span className={s.apercuNom}>{nom.trim() || "Nom de scène"}</span>
        </div>
      </div>
      <figcaption>{format === "bureau" ? "Ordinateur" : "Téléphone"}</figcaption>
    </figure>
  );
}
