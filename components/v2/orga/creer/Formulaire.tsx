"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import s from "../../espace.module.css";
import v from "../../v2.module.css";
import Icon from "../../Icon";
import Carte from "../../public/Carte";
import type { EvenementCarte } from "../../public/evenement";
import { CATEGORIES, MAX_CATEGORIES, valeurCategorie } from "@/lib/categories";
import Images, { type ImageLocale } from "./Images";
import Billets, { nouveauTarif, tarifValide, type TarifSaisi } from "./Billets";
import Artistes, { valeurArtistes, type ArtisteChoisi, type ArtisteTrouve } from "./Artistes";

/** Villes proposées (même liste que l'ancien formulaire de création). */
const VILLES = ["Cotonou", "Porto-Novo", "Ouidah", "Abomey", "Parakou", "Grand-Popo"];
/** Valeurs enregistrées en base (libellé sans emoji), comme la preview les affiche. */
const CATEGORIES_V2 = CATEGORIES.map(valeurCategorie);

/** `taux` : pays.taux_commission_defaut, le taux appliqué à l'événement créé. */
type Pays = { code: string; nom: string; taux: number };

function BoutonEnvoi({ valide, pleine = false, verifie }: { valide: boolean; pleine?: boolean; verifie: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={pleine ? { flex: 1 } : undefined} aria-disabled={!valide || pending}>
      {pending ? (verifie ? "Publication…" : "Envoi…") : verifie ? "Publier l'événement" : "Envoyer pour validation"}
    </button>
  );
}

/**
 * Formulaire de création (V2), repris de la preview (v2/creer/Formulaire.tsx)
 * et branché sur l'action serveur de prod `publierEvenement`, qui revalide
 * tout (champs, dates, pays) et crée l'événement en validation.
 * Blocs : 1 Informations générales, 2 Date & lieu, 3 Images, 4 Billetterie.
 */
export default function Formulaire({
  action,
  pays,
  aujourdhui,
  erreurServeur,
  chercherArtistes,
  verifie,
  peutMoiMeme,
  artisteInitial = null,
}: {
  action: (formData: FormData) => void;
  pays: Pays[];
  aujourdhui: string;
  erreurServeur: string | null;
  /** Recherche du sélecteur d'artistes (action serveur chercherArtistes). */
  chercherArtistes: (q: string) => Promise<ArtisteTrouve[]>;
  /** Compte vérifié : ses nouveaux artistes sont publiés sans validation. */
  verifie: boolean;
  /** Le compte n'a pas encore sa propre page artiste. */
  peutMoiMeme: boolean;
  /** Artiste déjà sélectionné (?artiste=, « Ajouter une date » de la page artiste). */
  artisteInitial?: ArtisteTrouve | null;
}) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState("");
  const [heure, setHeure] = useState("");
  const [multiJours, setMultiJours] = useState(false);
  const [dateFin, setDateFin] = useState("");
  const [paysCode, setPaysCode] = useState(pays[0]?.code ?? "");
  const commission = pays.find((p) => p.code === paysCode)?.taux ?? 0.08;
  const [lieu, setLieu] = useState("");
  const [ville, setVille] = useState("");
  const [tarifs, setTarifs] = useState<TarifSaisi[]>(() => [nouveauTarif("Standard")]);
  const [images, setImages] = useState<ImageLocale[]>([]);
  const [artistes, setArtistes] = useState<ArtisteChoisi[]>(() => (artisteInitial ? [{ cle: artisteInitial.id, trouve: artisteInitial }] : []));
  const [principale, setPrincipale] = useState<string | null>(null);
  const [tente, setTente] = useState(false); // erreurs affichées après une tentative d'envoi
  // Aperçu non interactif : `inert` n'est pas typé en React 18, posé à la main.
  const apercuRef = useRef<HTMLDivElement>(null);
  const apercuMobileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    apercuRef.current?.setAttribute("inert", "");
    apercuMobileRef.current?.setAttribute("inert", "");
  });

  // Fichiers compressés → <input type="file" name="images_nouvelles"> (DataTransfer :
  // seul moyen de piloter par JS la liste de fichiers d'un input).
  const fichiersRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!fichiersRef.current) return;
    const dt = new DataTransfer();
    for (const i of images) if (i.fichier) dt.items.add(i.fichier);
    fichiersRef.current.files = dt.files;
  }, [images]);
  const indexPrincipale = Math.max(0, images.findIndex((i) => i.cle === principale));

  // Dernier jour de l'événement : borne la date de fin de vente des tarifs.
  const finEvenement = (multiJours && dateFin ? dateFin : dateDebut) || null;

  const check = {
    titre: titre.trim().length > 1,
    description: description.trim().length > 0,
    categories: categories.length > 0,
    date: !!dateDebut && dateDebut >= aujourdhui && (!multiJours || (!!dateFin && dateFin > dateDebut)),
    lieu: lieu.trim().length > 0 && !!ville,
    images: images.length > 0,
    billetterie: tarifs.length > 0 && tarifs.every((x) => tarifValide(x, finEvenement)),
  };
  const requis = [check.titre, check.categories, check.date, check.lieu, check.billetterie];
  const faits = requis.filter(Boolean).length;
  const valide = faits === requis.length;
  const bloc1 = check.titre && check.categories;
  const bloc2 = check.date && check.lieu;
  // Signalée dès la saisie (pas besoin d'attendre l'envoi) : c'est une incohérence, pas un oubli.
  const finAvantDebut = multiJours && !!dateFin && !!dateDebut && dateFin <= dateDebut;

  const basculer = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : prev.length < MAX_CATEGORIES ? [...prev, c] : prev));

  const apercu: EvenementCarte = {
    slug: "apercu",
    titre: titre.trim() || "Nom de l'événement",
    categorie: categories[0] ?? "Catégorie",
    lieu: lieu.trim() || "Lieu",
    ville: ville || "Ville",
    debut: dateDebut || aujourdhui,
    fin: multiJours && dateFin > dateDebut ? dateFin : undefined,
    heure: heure || "Heure",
    prixMin: Math.min(...tarifs.filter((x) => tarifValide(x, finEvenement)).map((x) => Number(x.prix))),
    prixLibelle: tarifs.some((x) => tarifValide(x, finEvenement)) ? undefined : "Tarifs à définir",
    organisateur: "",
    tags: categories,
    image: (images.find((i) => i.cle === principale) ?? images[0])?.url ?? null,
  };

  const manquants = (
    [
      ["le nom", check.titre],
      ["une catégorie", check.categories],
      ["la date", check.date],
      ["le lieu et la ville", check.lieu],
      ["des tarifs complets", check.billetterie],
    ] as [string, boolean][]
  )
    .filter(([, ok]) => !ok)
    .map(([l]) => l);

  return (
    <form
      className={s.form}
      noValidate
      action={action}
      onSubmit={(e) => {
        setTente(true);
        if (!valide) {
          e.preventDefault();
          // Amène l'organisateur sur le premier champ à corriger.
          requestAnimationFrame(() => {
            // Catégories (boutons) : la première puce disponible du groupe signalé.
            const champ = document.querySelector<HTMLElement>(`form [aria-invalid="true"], form [data-invalide] button:not(:disabled)`);
            champ?.focus();
            champ?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
        }
      }}
    >
      {/* Champs attendus par publierEvenement (app/(orga)/creer/actions.ts). */}
      <input type="hidden" name="categories" value={JSON.stringify(categories)} />
      <input type="hidden" name="tickets" value={JSON.stringify(tarifs.map((t) => ({ nom: t.nom, prix: t.prix, quantite: t.quantite, venteJusqua: t.venteJusqua })))} />
      <input type="hidden" name="pays_code" value={paysCode} />
      <input type="hidden" name="artistes" value={valeurArtistes(artistes)} />
      {multiJours && dateFin && <input type="hidden" name="date_fin" value={dateFin} />}
      <input type="hidden" name="image_principale_type" value={images.length ? "nouvelle" : ""} />
      <input type="hidden" name="image_principale_valeur" value={String(indexPrincipale)} />
      <input ref={fichiersRef} type="file" name="images_nouvelles" multiple hidden />

      <div className={s.formCorps}>
        {erreurServeur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>{erreurServeur}</span>
          </p>
        )}
        {tente && !valide && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>Il manque {manquants.join(", ")}. Les champs à corriger sont signalés en rouge.</span>
          </p>
        )}
        {/* 1. Informations générales */}
        <section className={s.bloc} aria-labelledby="b1">
          <div className={s.blocTete}>
            <span className={`${s.num} ${bloc1 ? s.numFait : ""}`} aria-hidden="true">
              {bloc1 ? <Icon name="check" size={16} /> : 1}
            </span>
            <h2 id="b1" className={s.blocTitre}>
              Informations générales
            </h2>
          </div>

          <div className={`${s.champ} ${tente && !check.titre ? s.champErreur : ""}`}>
            <label htmlFor="titre">Nom de l&apos;événement</label>
            <input
              id="titre"
              name="titre"
              type="text"
              placeholder="Ex : Concert de fin d'année"
              value={titre}
              maxLength={120}
              aria-invalid={tente && !check.titre}
              aria-describedby={tente && !check.titre ? "titre-err" : undefined}
              onChange={(e) => setTitre(e.target.value)}
            />
            {tente && !check.titre && (
              <span id="titre-err" className={s.erreur}>
                Donne un nom à ton événement (2 caractères minimum).
              </span>
            )}
          </div>

          <div className={s.champ}>
            <label htmlFor="description">
              Description <small>(recommandée)</small>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Programme, artistes, ambiance, infos pratiques…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
              aria-describedby={tente && !check.categories ? "cat-msg" : undefined}
              data-invalide={check.categories ? undefined : ""}
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
            {tente && !check.categories ? (
              <span id="cat-msg" className={s.erreur}>
                Choisis au moins une catégorie.
              </span>
            ) : (
              <span className={s.aide}>La première choisie sert d&apos;étiquette principale sur la carte.</span>
            )}
          </div>
        </section>

        {/* 2. Date & lieu */}
        <section className={s.bloc} aria-labelledby="b2">
          <div className={s.blocTete}>
            <span className={`${s.num} ${bloc2 ? s.numFait : ""}`} aria-hidden="true">
              {bloc2 ? <Icon name="check" size={16} /> : 2}
            </span>
            <h2 id="b2" className={s.blocTitre}>
              Date &amp; lieu
            </h2>
          </div>

          <div className={s.deux}>
            <div className={`${s.champ} ${tente && !check.date && !finAvantDebut ? s.champErreur : ""}`}>
              <label htmlFor="date_debut">{multiJours ? "Premier jour" : "Date"}</label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                min={aujourdhui}
                value={dateDebut}
                aria-invalid={tente && !check.date && !finAvantDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className={s.champ}>
              <label htmlFor="heure">
                Heure <small>(début)</small>
              </label>
              <input id="heure" name="heure" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} />
            </div>
          </div>
          {tente && !dateDebut && <span className={s.erreur}>Indique la date de l&apos;événement.</span>}
          {/* Absent de la preview : une date déjà passée est refusée par le serveur (erreur=date_passee). */}
          {tente && !!dateDebut && dateDebut < aujourdhui && <span className={s.erreur}>Cette date est déjà passée.</span>}

          <label className={s.case}>
            <input
              type="checkbox"
              checked={multiJours}
              onChange={(e) => {
                setMultiJours(e.target.checked);
                if (!e.target.checked) setDateFin("");
              }}
            />
            Plusieurs jours (festival, week-end…)
          </label>

          {multiJours && (
            <div className={`${s.champ} ${finAvantDebut || (tente && !dateFin) ? s.champErreur : ""}`}>
              <label htmlFor="date_fin">Dernier jour</label>
              <input
                id="date_fin"
                type="date"
                min={dateDebut || aujourdhui}
                value={dateFin}
                aria-invalid={finAvantDebut || (tente && !dateFin)}
                aria-describedby="fin-msg"
                onChange={(e) => setDateFin(e.target.value)}
              />
              {finAvantDebut ? (
                <span id="fin-msg" className={s.erreur}>
                  Le dernier jour doit venir après le premier.
                </span>
              ) : tente && !dateFin ? (
                <span id="fin-msg" className={s.erreur}>
                  Indique le dernier jour du festival.
                </span>
              ) : (
                <span id="fin-msg" className={s.aide}>
                  L&apos;événement s&apos;affiche au programme de chaque jour.
                </span>
              )}
            </div>
          )}

          <div className={s.champ}>
            {pays.length > 1 ? (
              <>
                {/* Absent de la preview (un seul pays ouvert) : choix du pays quand il y en a plusieurs. */}
                <label htmlFor="pays">Pays</label>
                <select id="pays" value={paysCode} onChange={(e) => setPaysCode(e.target.value)}>
                  {pays.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className={s.etiquette}>Pays</span>
                <p className={s.verrou}>
                  <Icon name="pin" size={20} />
                  <span>
                    <b>{pays[0]?.nom ?? "Bénin"}</b> · seul pays ouvert pour l&apos;instant
                  </span>
                </p>
              </>
            )}
          </div>

          <div className={`${s.champ} ${tente && !lieu.trim() ? s.champErreur : ""}`}>
            <label htmlFor="lieu">Lieu</label>
            <input
              id="lieu"
              name="lieu"
              type="text"
              placeholder="Nom de la salle, de la plage ou adresse"
              value={lieu}
              aria-invalid={tente && !lieu.trim()}
              onChange={(e) => setLieu(e.target.value)}
            />
            {tente && !lieu.trim() && <span className={s.erreur}>Indique où se passe l&apos;événement.</span>}
          </div>

          <div className={`${s.champ} ${tente && !ville ? s.champErreur : ""}`}>
            <label htmlFor="ville">Ville</label>
            <select id="ville" name="ville" value={ville} aria-invalid={tente && !ville} onChange={(e) => setVille(e.target.value)}>
              <option value="" disabled>
                Choisir une ville
              </option>
              {VILLES.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            {tente && !ville && <span className={s.erreur}>Choisis la ville.</span>}
          </div>
        </section>

        {/* 3. Images */}
        <section className={s.bloc} aria-labelledby="b3">
          <div className={s.blocTete}>
            <span className={`${s.num} ${check.images ? s.numFait : ""}`} aria-hidden="true">
              {check.images ? <Icon name="check" size={16} /> : 3}
            </span>
            <h2 id="b3" className={s.blocTitre}>
              Images <small className={s.aide} style={{ textTransform: "none", letterSpacing: 0 }}>(recommandées)</small>
            </h2>
          </div>
          <Images images={images} setImages={setImages} principale={principale} setPrincipale={setPrincipale} />
        </section>

        {/* 4. Billetterie */}
        <section className={s.bloc} aria-labelledby="b4">
          <div className={s.blocTete}>
            <span className={`${s.num} ${check.billetterie ? s.numFait : ""}`} aria-hidden="true">
              {check.billetterie ? <Icon name="check" size={16} /> : 4}
            </span>
            <h2 id="b4" className={s.blocTitre}>
              Billetterie
            </h2>
          </div>
          <Billets tarifs={tarifs} setTarifs={setTarifs} tente={tente} debut={dateDebut} fin={finEvenement} min={aujourdhui} commission={commission} />
        </section>

        {/* Aperçu sous 1024 px : la colonne latérale n'est pas affichée. */}
        <section className={`${s.bloc} ${s.seulMobile}`} aria-label="Aperçu de la carte">
          <p className={s.panneauTitre} style={{ marginBottom: 0 }}>
            Aperçu de la carte
          </p>
          <div ref={apercuMobileRef} aria-hidden="true">
            <Carte e={apercu} s={v} href="#" />
          </div>
        </section>
      </div>

      {/* Colonne latérale (≥ 1024 px) : aperçu + checklist + envoi. */}
      <aside className={s.cote}>
        <div>
          <p className={s.panneauTitre}>Aperçu de la carte</p>
          <div ref={apercuRef} aria-hidden="true">
            <Carte e={apercu} s={v} href="#" />
          </div>
        </div>
        <div className={s.panneau}>
          <p className={s.panneauTitre}>Avant l&apos;envoi</p>
          <Checklist check={check} />
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <BoutonEnvoi valide={valide} verifie={verifie} />
          <p className={s.note}>
            {verifie
              ? "Ton compte est vérifié : l'événement est en ligne dès l'envoi, sans attendre l'équipe."
              : "L'équipe Xwézan vérifie chaque événement avant sa mise en ligne. Tu reçois un e-mail dès qu'il est validé."}
          </p>
        </div>
      </aside>

      {/* Barre d'envoi collée en bas sur mobile. */}
      <div className={`${s.barreBas} ${s.masqueDesktop}`}>
        <span className={s.barreBasInfo}>
          {faits}/{requis.length} obligatoires
        </span>
        <BoutonEnvoi valide={valide} pleine verifie={verifie} />
      </div>
      <div className={s.espaceBarreBas} aria-hidden="true" />
    </form>
  );
}

function Checklist({ check }: { check: Record<"titre" | "description" | "categories" | "date" | "lieu" | "images" | "billetterie", boolean> }) {
  const items: [string, boolean, boolean][] = [
    ["Nom de l'événement", check.titre, true],
    ["Catégories", check.categories, true],
    ["Date", check.date, true],
    ["Lieu et ville", check.lieu, true],
    ["Billetterie", check.billetterie, true],
    ["Description", check.description, false],
    ["Images", check.images, false],
  ];
  return (
    <ul className={s.checklist}>
      {items.map(([libelle, ok, obligatoire]) => (
        <li key={libelle} className={ok ? s.fait : ""}>
          <Icon name={ok ? "check" : "minus"} size={16} />
          <span>
            {libelle}
            {!obligatoire && <small style={{ color: "var(--muted)" }}> · recommandé</small>}
          </span>
          <span className={s.srOnly}>{ok ? " : fait" : " : à compléter"}</span>
        </li>
      ))}
    </ul>
  );
}
