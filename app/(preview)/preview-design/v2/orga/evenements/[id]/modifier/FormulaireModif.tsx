"use client";

import { useEffect, useRef, useState } from "react";
import s from "../../../../espace.module.css";
import v from "../../../../v2.module.css";
import Icon from "../../../../../Icon";
import Carte from "../../../../../Carte";
import type { Evenement } from "../../../../../_data";
import { B } from "../../../../Coquille";
import Images, { type ImageLocale } from "../../../../creer/Images";
import Artistes, { valeurArtistes, type ArtisteChoisi } from "../../../../creer/Artistes";
import { chercherDemo } from "../../../../creer/artistesDemo";
import { AUJOURDHUI, CATEGORIES_ORGA, montant, nombre, type EvenementOrga } from "../../../_orga";

const MAX_CATEGORIES = 3;

/**
 * Artistes déjà rattachés (factices) : un artiste du label, un artiste d'un autre
 * label accepté, un autre encore proposé (design/ARTISTES.md, lot 2).
 */
const ARTISTES_DEMO: ArtisteChoisi[] = [
  { cle: "a1", rattache: "accepte", trouve: { id: "a1", nom: "Zeynab Habib", photo: null, statut: "valide", gere: true } },
  { cle: "x2", rattache: "accepte", trouve: { id: "x2", nom: "Sèna Melody", photo: null, statut: "valide", gere: false } },
  { cle: "x3", rattache: "propose", trouve: { id: "x3", nom: "Kpanlogo Crew", photo: null, statut: "valide", gere: false } },
];

/**
 * Modification d'un événement (preview V2). Même périmètre que
 * components/FormulaireEdition.tsx : description, catégories, date/heure,
 * images. Nom, lieu, ville, pays et tarifs sont figés (slug indexé, billets
 * déjà imprimés). Règles de date identiques à modifier/actions.ts (cef6910) :
 * pas de date passée, et plus d'avance de date dès qu'un billet est vendu.
 */
export default function FormulaireModif({
  e,
  vendus,
  imageInitiale,
  erreurServeur,
}: {
  e: EvenementOrga;
  vendus: number;
  imageInitiale: string | null;
  erreurServeur: boolean;
}) {
  // Dernier état enregistré : sert de référence pour « modifié » et pour les
  // règles de date (comme la ligne en base côté serveur).
  const [base, setBase] = useState({
    description: e.description,
    categories: e.categories,
    dateDebut: e.debut,
    dateFin: e.fin ?? "",
    heure: e.heure,
  });
  const initial = base;
  const [description, setDescription] = useState(initial.description);
  const [categories, setCategories] = useState<string[]>(initial.categories);
  const [dateDebut, setDateDebut] = useState(initial.dateDebut);
  const [multiJours, setMultiJours] = useState(!!e.fin);
  const [dateFin, setDateFin] = useState(initial.dateFin);
  const [heure, setHeure] = useState(initial.heure);
  const [images, setImages] = useState<ImageLocale[]>(() => (imageInitiale ? [{ cle: "existante-0", nom: "Affiche actuelle", url: imageInitiale }] : []));
  const [principale, setPrincipale] = useState<string | null>(null);
  const [etat, setEtat] = useState<"saisie" | "envoi" | "enregistre">("saisie");
  const [imagesTouchees, setImagesTouchees] = useState(false);
  const [baseArtistes, setBaseArtistes] = useState<ArtisteChoisi[]>(ARTISTES_DEMO);
  const [artistes, setArtistes] = useState<ArtisteChoisi[]>(ARTISTES_DEMO);
  const [tente, setTente] = useState(false);

  const apercuRef = useRef<HTMLDivElement>(null);
  useEffect(() => apercuRef.current?.setAttribute("inert", ""));
  const minuterie = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(minuterie.current), []);

  const fin = multiJours && dateFin ? dateFin : null;
  const ancienneReference = base.dateFin || base.dateDebut;
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
        : dateChangee && ((debutChange && dateDebut < AUJOURDHUI) || nouvelleReference < AUJOURDHUI)
          ? "Impossible de placer l'événement à une date passée."
          : dateChangee && vendus > 0 && (dateDebut < base.dateDebut || nouvelleReference < ancienneReference)
            ? `${nombre(vendus)} billets sont déjà vendus : tu peux repousser l'événement, pas avancer sa date.`
            : null;
  const erreurCategories = categories.length === 0 ? "Choisis au moins une catégorie." : null;

  const modifie =
    imagesTouchees ||
    valeurArtistes(artistes) !== valeurArtistes(baseArtistes) ||
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
  const apercu: Evenement = {
    slug: e.id,
    titre: e.titre,
    categorie: categories[0] ?? "Catégorie",
    lieu: e.lieu,
    ville: e.ville,
    debut: dateDebut || e.debut,
    fin: fin && fin > dateDebut ? fin : undefined,
    heure: heure || "Heure",
    prixMin: Math.min(...valides.map((t) => t.prix)),
    organisateur: "",
    tags: categories,
    image: (images.find((i) => i.cle === principale) ?? images[0])?.url ?? null,
  };

  return (
    <form
      className={s.form}
      noValidate
      aria-busy={etat === "envoi"}
      onSubmit={(ev) => {
        ev.preventDefault();
        if (etat === "envoi" || !modifie) return;
        setTente(true);
        if (!valide) {
          // Amène sur le premier problème : champ invalide ou, pour les
          // catégories (boutons), la première puce disponible.
          requestAnimationFrame(() => {
            const champ = document.querySelector<HTMLElement>(`form [aria-invalid="true"], form [data-invalide] button:not(:disabled)`);
            champ?.focus();
            champ?.scrollIntoView({ block: "center", behavior: "smooth" });
          });
          return;
        }
        setEtat("envoi");
        minuterie.current = setTimeout(() => {
          setBase({ description, categories, dateDebut, dateFin: fin ?? "", heure });
          setEtat("enregistre");
          setImagesTouchees(false);
          setBaseArtistes(artistes);
          window.scrollTo({ top: 0 });
        }, 1000);
      }}
    >
      <div className={s.formCorps}>
        {erreurServeur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>
              Des billets ont déjà été vendus : tu peux repousser l&apos;événement, mais pas avancer sa date. Pour un cas exceptionnel, écris à{" "}
              <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>.
            </span>
          </p>
        )}
        {etat === "enregistre" && !modifie && (
          <p className={s.alerte} role="status" style={{ marginBottom: 8 }}>
            <Icon name="check" />
            <span>
              Modifications enregistrées. <a href={`${B}/orga/evenements/${e.id}`}>Retour à la fiche</a>
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
            <dd>{e.pays}</dd>
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
            <textarea id="description" rows={5} value={description} onChange={(ev) => setDescription(ev.target.value)} />
          </div>
          <Artistes choisis={artistes} setChoisis={setArtistes} chercher={chercherDemo} verifie={false} peutMoiMeme />
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
                type="date"
                min={vendus > 0 && base.dateDebut > AUJOURDHUI ? base.dateDebut : AUJOURDHUI}
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
              <input id="heure" type="time" value={heure} onChange={(ev) => setHeure(ev.target.value)} />
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
              <input id="date_fin" type="date" min={dateDebut || AUJOURDHUI} value={dateFin} onChange={(ev) => setDateFin(ev.target.value)} />
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
        <Enregistrer modifie={modifie} enCours={etat === "envoi"} />
      </aside>

      <div className={`${s.barreBas} ${s.masqueDesktop}`}>
        <span className={s.barreBasInfo}>{modifie ? "Modifications non enregistrées" : "Aucune modification"}</span>
        <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: 1 }} disabled={!modifie || etat === "envoi"}>
          {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      <div className={s.espaceBarreBas} aria-hidden="true" />
    </form>
  );
}

function Enregistrer({ modifie, enCours }: { modifie: boolean; enCours: boolean }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={!modifie || enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
      <p className={s.note}>{modifie ? "Tes modifications ne sont pas encore enregistrées." : "Aucune modification pour l'instant."}</p>
    </div>
  );
}
