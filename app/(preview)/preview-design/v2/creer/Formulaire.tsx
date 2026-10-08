"use client";

import { useEffect, useRef, useState } from "react";
import s from "../espace.module.css";
import v from "../v2.module.css";
import Icon from "../../Icon";
import Carte from "../../Carte";
import type { Evenement } from "../../_data";
import { AUJOURDHUI, CATEGORIES_ORGA, ORGA, VILLES } from "../orga/_orga";
import { B } from "../Coquille";
import Images, { type ImageLocale } from "./Images";
import Billets, { nouveauTarif, tarifValide, type TarifSaisi } from "./Billets";
import Artistes, { type ArtisteChoisi } from "./Artistes";
import { artisteDemo, chercherDemo } from "./artistesDemo";

const MAX_CATEGORIES = 3; // lib/categories.ts

/**
 * Formulaire de création (preview V2). Même contenu et mêmes règles que
 * components/FormulaireCreation.tsx, état local uniquement, aucun envoi.
 * Blocs : 1 Informations générales, 2 Date & lieu, 3 Images, 4 Billetterie,
 * puis envoi (simulé) et écran de confirmation.
 *
 * `erreurServeur` : refus renvoyé par le serveur (?etat=erreur).
 * `envoyeDemo` : ouvre directement l'écran de confirmation (?etat=envoye).
 * `verifie` : compte vérifié (?etat=verifie) : événement et nouveaux artistes publiés sans validation.
 */
// Saisie de démonstration pour ?etat=envoye.
const DEMO = { titre: "Nuit Zinli : Cotonou by Night", categories: ["Concert"], dateDebut: "2026-10-24", heure: "20:00", lieu: "Palais des Congrès", ville: "Cotonou" };

type Etape = "saisie" | "envoi" | "envoye";

export default function Formulaire({
  erreurServeur = false,
  envoyeDemo = false,
  verifie = false,
  artiste,
}: {
  erreurServeur?: boolean;
  envoyeDemo?: boolean;
  verifie?: boolean;
  /** ?artiste=<id> : artiste déjà sélectionné (« Ajouter une date » de la page artiste). */
  artiste?: string;
}) {
  const d = envoyeDemo ? DEMO : null;
  const [etape, setEtape] = useState<Etape>(envoyeDemo ? "envoye" : "saisie");
  const [titre, setTitre] = useState(d?.titre ?? "");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>(d?.categories ?? []);
  const [dateDebut, setDateDebut] = useState(d?.dateDebut ?? "");
  const [heure, setHeure] = useState(d?.heure ?? "");
  const [multiJours, setMultiJours] = useState(false);
  const [dateFin, setDateFin] = useState("");
  const [lieu, setLieu] = useState(d?.lieu ?? "");
  const [ville, setVille] = useState(d?.ville ?? "");
  const [tarifs, setTarifs] = useState<TarifSaisi[]>(() =>
    d ? [{ ...nouveauTarif("Standard"), prix: "3000", quantite: "400" }, { ...nouveauTarif("Carré Or"), prix: "10000", quantite: "50" }] : [nouveauTarif("Standard")],
  );
  const [images, setImages] = useState<ImageLocale[]>([]);
  const [artistes, setArtistes] = useState<ArtisteChoisi[]>(() => {
    const a = artisteDemo(artiste);
    return a ? [{ cle: a.id, trouve: a }] : [];
  });
  const [principale, setPrincipale] = useState<string | null>(null);
  const [tente, setTente] = useState(false); // erreurs affichées après une tentative d'envoi
  // Aperçu non interactif : `inert` n'est pas typé en React 18, posé à la main.
  const apercuRef = useRef<HTMLDivElement>(null);
  const apercuMobileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    apercuRef.current?.setAttribute("inert", "");
    apercuMobileRef.current?.setAttribute("inert", "");
  });
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuterie.current), []);

  // Dernier jour de l'événement : borne la date de fin de vente des tarifs.
  const finEvenement = (multiJours && dateFin ? dateFin : dateDebut) || null;

  const check = {
    titre: titre.trim().length > 1,
    description: description.trim().length > 0,
    categories: categories.length > 0,
    date: !!dateDebut && (!multiJours || (!!dateFin && dateFin > dateDebut)),
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

  const apercu: Evenement = {
    slug: "apercu",
    titre: titre.trim() || "Nom de l'événement",
    categorie: categories[0] ?? "Catégorie",
    lieu: lieu.trim() || "Lieu",
    ville: ville || "Ville",
    debut: dateDebut || AUJOURDHUI,
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

  if (etape === "envoye") {
    return <Confirmation titre={apercu.titre} apercu={apercu} publie={verifie} />;
  }

  return (
    <form
      className={s.form}
      noValidate
      aria-busy={etape === "envoi"}
      onSubmit={(e) => {
        e.preventDefault();
        if (etape !== "saisie") return;
        setTente(true);
        if (!valide) {
          // Amène l'organisateur sur le premier champ à corriger.
          requestAnimationFrame(() => {
            // Catégories (boutons) : la première puce disponible du groupe signalé.
            const champ = document.querySelector<HTMLElement>(`form [aria-invalid="true"], form [data-invalide] button:not(:disabled)`);
            champ?.focus();
            champ?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
          return;
        }
        setEtape("envoi");
        minuterie.current = setTimeout(() => {
          setEtape("envoye");
          window.scrollTo({ top: 0 });
        }, 1200);
      }}
    >
      <div className={s.formCorps}>
        {erreurServeur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>L&apos;envoi d&apos;une image a échoué. Rien n&apos;a été enregistré, réessaie.</span>
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

          {/* « Ouidah Live » est un label sans page personnelle : « Moi-même » reste possible. */}
          <Artistes choisis={artistes} setChoisis={setArtistes} chercher={chercherDemo} verifie={verifie} peutMoiMeme />

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
              {CATEGORIES_ORGA.map((c) => {
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
            <div className={`${s.champ} ${tente && !dateDebut ? s.champErreur : ""}`}>
              <label htmlFor="date_debut">{multiJours ? "Premier jour" : "Date"}</label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                min={AUJOURDHUI}
                value={dateDebut}
                aria-invalid={tente && !dateDebut}
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
                name="date_fin"
                type="date"
                min={dateDebut || AUJOURDHUI}
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
            <span className={s.etiquette}>Pays</span>
            <p className={s.verrou}>
              <Icon name="pin" size={20} />
              <span>
                <b>Bénin</b> · seul pays ouvert pour l&apos;instant
              </span>
            </p>
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
          <Billets tarifs={tarifs} setTarifs={setTarifs} tente={tente} debut={dateDebut} fin={finEvenement} min={AUJOURDHUI} />
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
        <Envoi valide={valide} enCours={etape === "envoi"} verifie={verifie} />
      </aside>

      {/* Barre d'envoi collée en bas sur mobile. */}
      <div className={`${s.barreBas} ${s.masqueDesktop}`}>
        <span className={s.barreBasInfo}>
          {faits}/{requis.length} obligatoires
        </span>
        <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: 1 }} aria-disabled={!valide || etape === "envoi"}>
          {etape === "envoi" ? (verifie ? "Publication…" : "Envoi…") : verifie ? "Publier l'événement" : "Envoyer pour validation"}
        </button>
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

function Envoi({ valide, enCours, verifie }: { valide: boolean; enCours: boolean; verifie: boolean }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={!valide || enCours}>
        {enCours ? (verifie ? "Publication…" : "Envoi…") : verifie ? "Publier l'événement" : "Envoyer pour validation"}
      </button>
      <p className={s.note}>
        {verifie
          ? "Ton compte est vérifié : l'événement est en ligne dès l'envoi, sans attendre l'équipe."
          : "L'équipe Xwézan vérifie chaque événement avant sa mise en ligne. Tu reçois un e-mail dès qu'il est validé."}
      </p>
    </div>
  );
}

/** Écran après envoi : l'événement part en validation (statut en_validation en prod), ou `publie` pour un compte vérifié. */
function Confirmation({ titre, apercu, publie }: { titre: string; apercu: Evenement; publie: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titreRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.setAttribute("inert", "");
    titreRef.current?.focus();
  }, []);
  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 560 }}>
      <div style={{ display: "grid", gap: 12, justifyItems: "start" }} role="status">
        <Icon name="check" size={48} className={s.montantOr} />
        <h2 ref={titreRef} tabIndex={-1} className={s.titre} style={{ outline: "none" }}>
          {publie ? "Publié" : "Envoyé pour validation"}
        </h2>
        <p className={s.sousTitre} style={{ marginTop: 0 }}>
          {publie ? (
            <>« {titre} » est en ligne et en vente. Ton compte est vérifié : il n&apos;attend pas la validation de l&apos;équipe.</>
          ) : (
            <>
              L&apos;équipe Xwézan vérifie « {titre} » avant sa mise en ligne. Tu reçois un e-mail à <b>{ORGA.email}</b> dès qu&apos;il est validé.
            </>
          )}
        </p>
      </div>

      <div ref={ref} aria-hidden="true">
        <Carte e={apercu} s={v} href="#" />
      </div>

      <div className={s.panneau}>
        <p className={s.panneauTitre}>Et ensuite ?</p>
        <ol className={s.checklist} style={{ listStyle: "none", padding: 0 }}>
          {publie ? (
            <>
              <li className={s.fait}>
                <Icon name="check" size={16} /> Il est en vente : statut « En vente » dans ton tableau de bord
              </li>
              <li>
                <Icon name="link" size={16} /> Partage le lien de ta page pour lancer les ventes
              </li>
            </>
          ) : (
            <>
              <li className={s.fait}>
                <Icon name="check" size={16} /> Il apparaît déjà dans ton tableau de bord, statut « En validation »
              </li>
              <li>
                <Icon name="clock" size={16} /> Après validation par l&apos;équipe, il est mis en vente et tu reçois un e-mail
              </li>
              <li>
                <Icon name="link" size={16} /> Partage alors le lien de ta page pour lancer les ventes
              </li>
            </>
          )}
        </ol>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {publie && (
          <a href={`${B}/evenement`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="eye" /> Voir la page
          </a>
        )}
        <a href={`${B}/orga`} className={`${s.btn} ${publie ? s.btnGris : s.btnOr} ${s.btnGrand}`}>
          Voir mon tableau de bord
        </a>
        <a href={`${B}/creer`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
          <Icon name="plus" /> Créer un autre événement
        </a>
      </div>
    </div>
  );
}
