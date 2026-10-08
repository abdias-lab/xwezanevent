"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import s from "../../espace.module.css";
import v from "../../v2.module.css";
import Icon from "../../Icon";
import Carte from "../../public/Carte";
import type { EvenementCarte } from "../../public/evenement";
import { montant, nombre } from "../../format";
import { CATEGORIES, MAX_CATEGORIES, valeurCategorie } from "@/lib/categories";
import Images, { type ImageLocale } from "../creer/Images";
import Artistes, { valeurArtistes, type ArtisteChoisi, type ArtisteTrouve } from "../creer/Artistes";

/** Valeurs enregistrées en base (libellé sans emoji), comme la preview les affiche. */
const CATEGORIES_V2 = CATEGORIES.map(valeurCategorie);

/** Ce qui est en base au chargement de la page : référence de « modifié » et des règles de date. */
export type EvenementModif = {
  id: string;
  slug: string;
  titre: string;
  lieu: string;
  ville: string;
  pays: string | null;
  description: string;
  categories: string[];
  debut: string;
  fin: string | null;
  heure: string;
  images: { url: string; principale: boolean }[];
  tarifs: { nom: string; prix: number; total: number; vendus: number }[];
};

function BoutonEnregistrer({ modifie, pleine = false }: { modifie: boolean; pleine?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={pleine ? { flex: 1 } : undefined} disabled={!modifie || pending}>
      {pending ? "Enregistrement…" : pleine ? "Enregistrer" : "Enregistrer les modifications"}
    </button>
  );
}

/**
 * Modification d'un événement (V2), repris de la preview
 * (v2/orga/evenements/[id]/modifier/FormulaireModif.tsx) et branché sur
 * l'action serveur de prod `modifierEvenement`, qui revalide tout (dates,
 * ventes, propriété, statut). Nom, lieu, ville, pays et tarifs sont figés.
 */
export default function FormulaireModif({
  action,
  e,
  vendus,
  aujourdhui,
  erreurServeur,
  enregistre,
  artistes: artistesInitiaux,
  chercherArtistes,
  verifie,
  peutMoiMeme,
}: {
  action: (formData: FormData) => void;
  e: EvenementModif;
  vendus: number;
  aujourdhui: string;
  erreurServeur: ReactNode | null;
  enregistre: boolean;
  /** Artistes déjà rattachés, dans l'ordre (design/ARTISTES.md, lot 2). */
  artistes: ArtisteChoisi[];
  chercherArtistes: (q: string) => Promise<ArtisteTrouve[]>;
  verifie: boolean;
  peutMoiMeme: boolean;
}) {
  const initial = { description: e.description, categories: e.categories, dateDebut: e.debut, dateFin: e.fin ?? "", heure: e.heure };
  const [description, setDescription] = useState(initial.description);
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [dateDebut, setDateDebut] = useState(initial.dateDebut);
  const [multiJours, setMultiJours] = useState(!!e.fin);
  const [dateFin, setDateFin] = useState(initial.dateFin);
  const [heure, setHeure] = useState(initial.heure);
  // Images déjà en ligne : sans fichier, conservées par leur adresse.
  const [images, setImages] = useState<ImageLocale[]>(() => e.images.map((i) => ({ cle: i.url, nom: "déjà en ligne", url: i.url, fichier: null })));
  const [principale, setPrincipale] = useState<string | null>(() => e.images.find((i) => i.principale)?.url ?? null);
  const [imagesTouchees, setImagesTouchees] = useState(false);
  const [artistes, setArtistes] = useState<ArtisteChoisi[]>(artistesInitiaux);
  const [tente, setTente] = useState(false);

  const apercuRef = useRef<HTMLDivElement>(null);
  useEffect(() => apercuRef.current?.setAttribute("inert", ""));

  // Nouveaux fichiers compressés → <input type="file" name="images_nouvelles"> (DataTransfer).
  const fichiersRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!fichiersRef.current) return;
    const dt = new DataTransfer();
    for (const i of images) if (i.fichier) dt.items.add(i.fichier);
    fichiersRef.current.files = dt.files;
  }, [images]);
  const conservees = images.filter((i) => !i.fichier);
  const nouvelles = images.filter((i) => i.fichier);
  const imagePrincipale = images.find((i) => i.cle === principale) ?? images[0] ?? null;

  const fin = multiJours && dateFin ? dateFin : null;
  const ancienneReference = initial.dateFin || initial.dateDebut;
  const nouvelleReference = fin ?? dateDebut;
  const debutChange = dateDebut !== initial.dateDebut;
  const dateChangee = debutChange || (fin ?? "") !== initial.dateFin;

  // Mêmes contrôles que le serveur, affichés dès la saisie.
  const erreurDate = !dateDebut
    ? "Indique la date de l'événement."
    : multiJours && !dateFin
      ? "Indique le dernier jour."
      : multiJours && dateFin <= dateDebut
        ? "Le dernier jour doit venir après le premier."
        : dateChangee && ((debutChange && dateDebut < aujourdhui) || nouvelleReference < aujourdhui)
          ? "Impossible de placer l'événement à une date passée."
          : dateChangee && vendus > 0 && (dateDebut < initial.dateDebut || nouvelleReference < ancienneReference)
            ? `${nombre(vendus)} billets sont déjà vendus : tu peux repousser l'événement, pas avancer sa date.`
            : null;
  const erreurCategories = categories.length === 0 ? "Choisis au moins une catégorie." : null;

  const modifie =
    imagesTouchees ||
    valeurArtistes(artistes) !== valeurArtistes(artistesInitiaux) ||
    description !== initial.description ||
    heure !== initial.heure ||
    dateChangee ||
    categories.join() !== initial.categories.join();
  const valide = !erreurDate && !erreurCategories;

  const setImagesSuivies = (f: (prev: ImageLocale[]) => ImageLocale[]) => {
    setImagesTouchees(true);
    setImages(f);
  };
  const basculer = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length < MAX_CATEGORIES ? [...prev, c] : prev));

  const valides = e.tarifs.filter((t) => t.total > 0);
  const apercu: EvenementCarte = {
    slug: e.slug,
    titre: e.titre,
    categorie: categories[0] ?? "Catégorie",
    lieu: e.lieu,
    ville: e.ville,
    debut: dateDebut || e.debut,
    fin: fin && fin > dateDebut ? fin : undefined,
    heure: heure || "Heure",
    prixMin: Math.min(...valides.map((t) => t.prix)),
    prixLibelle: valides.length ? undefined : "Tarifs à définir",
    organisateur: "",
    tags: categories,
    image: imagePrincipale?.url ?? null,
  };

  return (
    <form
      className={s.form}
      noValidate
      action={action}
      onSubmit={(ev) => {
        if (!modifie) {
          ev.preventDefault();
          return;
        }
        setTente(true);
        if (!valide) {
          ev.preventDefault();
          // Amène sur le premier problème : champ invalide ou, pour les
          // catégories (boutons), la première puce disponible.
          requestAnimationFrame(() => {
            const champ = document.querySelector<HTMLElement>(`form [aria-invalid="true"], form [data-invalide] button:not(:disabled)`);
            champ?.focus();
            champ?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }
      }}
    >
      {/* Champs attendus par modifierEvenement (app/(orga)/orga/evenements/[id]/modifier/actions.ts). */}
      <input type="hidden" name="categories" value={JSON.stringify(categories)} />
      <input type="hidden" name="artistes" value={valeurArtistes(artistes)} />
      <input type="hidden" name="images_conservees" value={JSON.stringify(conservees.map((i) => i.url))} />
      {multiJours && dateFin && <input type="hidden" name="date_fin" value={dateFin} />}
      <input type="hidden" name="image_principale_type" value={imagePrincipale ? (imagePrincipale.fichier ? "nouvelle" : "existante") : ""} />
      <input
        type="hidden"
        name="image_principale_valeur"
        value={imagePrincipale ? (imagePrincipale.fichier ? String(nouvelles.indexOf(imagePrincipale)) : imagePrincipale.url) : ""}
      />
      <input ref={fichiersRef} type="file" name="images_nouvelles" multiple hidden />

      <div className={s.formCorps}>
        {erreurServeur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>{erreurServeur}</span>
          </p>
        )}
        {enregistre && !modifie && (
          <p className={s.alerte} role="status" style={{ marginBottom: 8 }}>
            <Icon name="check" />
            <span>
              Modifications enregistrées. <Link href={`/orga/evenements/${e.id}`}>Retour à la fiche</Link>
            </span>
          </p>
        )}

        {/* Ce qui ne change pas */}
        <section className={s.bloc} aria-labelledby="m0">
          <div className={s.blocTete}>
            <Icon name="shield" size={20} />
            <h2 id="m0" className={s.blocTitre}>
              Informations fixes
            </h2>
          </div>
          <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
            <dt>Nom</dt>
            <dd>{e.titre}</dd>
            <dt>Lieu</dt>
            <dd>
              {e.lieu}, {e.ville}
            </dd>
            <dt>Pays</dt>
            <dd>{e.pays ?? "—"}</dd>
          </dl>
          <p className={s.aide}>
            Ils figurent sur les billets déjà vendus et dans l&apos;adresse de ta page. Pour les corriger, écris à{" "}
            <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
              contact@xwezan.com
            </a>
            .
          </p>
        </section>

        {/* 1. Présentation */}
        <section className={s.bloc} aria-labelledby="m1">
          <div className={s.blocTete}>
            <span className={s.num} aria-hidden="true">
              1
            </span>
            <h2 id="m1" className={s.blocTitre}>
              Présentation
            </h2>
          </div>
          <div className={s.champ}>
            <label htmlFor="description">Description</label>
            <textarea id="description" name="description" rows={5} value={description} onChange={(ev) => setDescription(ev.target.value)} />
          </div>
          <Artistes choisis={artistes} setChoisis={setArtistes} chercher={chercherArtistes} verifie={verifie} peutMoiMeme={peutMoiMeme} />
          <div className={s.champ}>
            <span className={s.etiquette} id="cat-label">
              Catégories <small>(jusqu&apos;à {MAX_CATEGORIES})</small>
            </span>
            <div
              className={s.puces}
              role="group"
              aria-labelledby="cat-label"
              aria-describedby={tente && erreurCategories ? "cat-msg" : undefined}
              data-invalide={erreurCategories ? "" : undefined}
            >
              {CATEGORIES_V2.map((c) => {
                const on = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className={`${s.puce} ${on ? s.puceOn : ""}`}
                    aria-pressed={on}
                    disabled={!on && categories.length >= MAX_CATEGORIES}
                    onClick={() => basculer(c)}
                  >
                    {on && <Icon name="check" size={16} />}
                    {c}
                  </button>
                );
              })}
            </div>
            {tente && erreurCategories && (
              <span id="cat-msg" className={s.erreur}>
                {erreurCategories}
              </span>
            )}
          </div>
        </section>

        {/* 2. Date & heure */}
        <section className={s.bloc} aria-labelledby="m2">
          <div className={s.blocTete}>
            <span className={s.num} aria-hidden="true">
              2
            </span>
            <h2 id="m2" className={s.blocTitre}>
              Date &amp; heure
            </h2>
          </div>
          {vendus > 0 && (
            <p className={s.alerte} style={{ marginBottom: 0 }}>
              <Icon name="info" />
              <span>
                <b>{nombre(vendus)} billets vendus.</b> Tu peux repousser l&apos;événement, pas l&apos;avancer. Les acheteurs sont prévenus par e-mail de tout
                changement de date.
              </span>
            </p>
          )}
          <div className={s.deux}>
            <div className={`${s.champ} ${erreurDate ? s.champErreur : ""}`}>
              <label htmlFor="date_debut">{multiJours ? "Premier jour" : "Date"}</label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                min={vendus > 0 && initial.dateDebut > aujourdhui ? initial.dateDebut : aujourdhui}
                value={dateDebut}
                aria-invalid={!!erreurDate}
                aria-describedby="date-msg"
                onChange={(ev) => setDateDebut(ev.target.value)}
              />
            </div>
            <div className={s.champ}>
              <label htmlFor="heure">
                Heure <small>(début)</small>
              </label>
              <input id="heure" name="heure" type="time" value={heure} onChange={(ev) => setHeure(ev.target.value)} />
            </div>
          </div>
          <label className={s.case}>
            <input
              type="checkbox"
              checked={multiJours}
              onChange={(ev) => {
                setMultiJours(ev.target.checked);
                if (!ev.target.checked) setDateFin("");
              }}
            />
            Plusieurs jours (festival, week-end…)
          </label>
          {multiJours && (
            <div className={`${s.champ} ${erreurDate && multiJours ? s.champErreur : ""}`}>
              <label htmlFor="date_fin">Dernier jour</label>
              <input id="date_fin" type="date" min={dateDebut || aujourdhui} value={dateFin} onChange={(ev) => setDateFin(ev.target.value)} />
            </div>
          )}
          {erreurDate ? (
            <span id="date-msg" className={s.erreur} role="alert">
              {erreurDate}
            </span>
          ) : dateChangee && vendus > 0 ? (
            <span id="date-msg" className={s.aide}>
              À l&apos;enregistrement, chaque acheteur reçoit un e-mail avec la nouvelle date.
            </span>
          ) : null}
        </section>

        {/* 3. Images */}
        <section className={s.bloc} aria-labelledby="m3">
          <div className={s.blocTete}>
            <span className={s.num} aria-hidden="true">
              3
            </span>
            <h2 id="m3" className={s.blocTitre}>
              Images
            </h2>
          </div>
          <Images
            images={images}
            setImages={setImagesSuivies}
            principale={principale}
            setPrincipale={(c) => {
              setImagesTouchees(true);
              setPrincipale(c);
            }}
          />
        </section>

        {/* 4. Billetterie, lecture seule */}
        <section className={s.bloc} aria-labelledby="m4">
          <div className={s.blocTete}>
            <span className={s.num} aria-hidden="true">
              4
            </span>
            <h2 id="m4" className={s.blocTitre}>
              Billetterie
            </h2>
          </div>
          <ul className={s.pile} style={{ gap: 8 }}>
            {e.tarifs.map((t) => (
              <li key={t.nom} className={s.verrou} style={{ justifyContent: "space-between", color: "inherit" }}>
                <span>
                  <b>{t.nom}</b>
                  <span className={s.note} style={{ display: "block" }}>
                    {t.prix === 0 ? "Gratuit" : montant(t.prix)}
                  </span>
                </span>
                <span className={`${s.note} ${s.chiffre}`}>
                  {nombre(t.vendus)} / {nombre(t.total)} vendus
                </span>
              </li>
            ))}
          </ul>
          <p className={s.aide}>
            Les tarifs ne se modifient pas une fois l&apos;événement créé. Besoin d&apos;un changement ? Écris à{" "}
            <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
              contact@xwezan.com
            </a>
            .
          </p>
        </section>
      </div>

      <aside className={s.cote}>
        <div>
          <p className={s.panneauTitre}>Aperçu de la carte</p>
          <div ref={apercuRef} aria-hidden="true">
            <Carte e={apercu} s={v} href="#" />
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <BoutonEnregistrer modifie={modifie} />
          <p className={s.note}>{modifie ? "Tes modifications ne sont pas encore enregistrées." : "Aucune modification pour l'instant."}</p>
        </div>
      </aside>

      <div className={`${s.barreBas} ${s.masqueDesktop}`}>
        <span className={s.barreBasInfo}>{modifie ? "Modifications non enregistrées" : "Aucune modification"}</span>
        <BoutonEnregistrer modifie={modifie} pleine />
      </div>
      <div className={s.espaceBarreBas} aria-hidden="true" />
    </form>
  );
}
