"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { publierEvenement } from "@/app/(orga)/creer/actions";
import SelecteurCategories from "@/components/SelecteurCategories";
import SelecteurImages from "@/components/SelecteurImages";

const VILLES = ["Cotonou", "Porto-Novo", "Ouidah", "Abomey", "Parakou", "Grand-Popo"];

interface Ticket {
  nom: string;
  prix: string;
  quantite: string;
  venteJusqua: string;
}

function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

function BoutonPublier({ actif }: { actif: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-or btn-large" type="submit" disabled={!actif || pending}>
      {pending ? "Publication…" : "🚀 Publier l'événement"}
    </button>
  );
}

export default function FormulaireCreation() {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState("");
  const [heure, setHeure] = useState("");
  const [lieu, setLieu] = useState("");
  const [ville, setVille] = useState(VILLES[0]);
  const [apercuPrincipal, setApercuPrincipal] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([
    { nom: "Standard", prix: "", quantite: "", venteJusqua: "" },
  ]);

  const majTicket = (i: number, champ: keyof Ticket, val: string) =>
    setTickets((prev) => prev.map((t, j) => (j === i ? { ...t, [champ]: val } : t)));
  const ajouterTicket = () =>
    setTickets((prev) => [...prev, { nom: "", prix: "", quantite: "", venteJusqua: "" }]);
  const retirerTicket = (i: number) =>
    setTickets((prev) => prev.filter((_, j) => j !== i));

  const ticketsValides = tickets.filter(
    (t) => t.nom.trim() && Number(t.quantite) > 0 && t.prix !== ""
  );
  const prixMin = ticketsValides.length
    ? Math.min(...ticketsValides.map((t) => Number(t.prix)))
    : null;

  const check = {
    titre: titre.trim().length > 1,
    description: description.trim().length > 0,
    date: !!dateDebut,
    lieu: lieu.trim().length > 0 && !!ville,
    affiche: !!apercuPrincipal,
    billetterie: ticketsValides.length > 0,
  };
  const valide =
    check.titre && check.date && check.lieu && categories.length > 0 && check.billetterie;

  const dateApercu = dateDebut
    ? new Date(`${dateDebut}T00:00:00`).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
    : "date";

  return (
    <form
      className="corps-cr"
      action={publierEvenement}
      encType="multipart/form-data"
    >
      <input type="hidden" name="tickets" value={JSON.stringify(tickets)} />

      <div>
        <span className="eyebrow">Espace organisateur</span>
        <h1 style={{ marginTop: 12 }}>Créer un événement</h1>
        <p className="sous">
          Remplis les informations ci-dessous pour publier ton événement
        </p>

        {/* 1. Infos générales */}
        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">1</span>
            <h2>Informations générales</h2>
          </div>
          <div className="champ-bloc">
            <label htmlFor="titre">Nom de l&apos;événement *</label>
            <input
              id="titre"
              name="titre"
              type="text"
              placeholder="Ex : Concert de fin d'année"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Décris ton événement…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <SelecteurCategories valeurs={categories} onChange={setCategories} />
        </div>

        {/* 2. Date & Lieu */}
        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">2</span>
            <h2>Date &amp; Lieu</h2>
          </div>
          <div className="rangee">
            <div className="champ-bloc">
              <label htmlFor="date_debut">Date de début *</label>
              <input
                id="date_debut"
                name="date_debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="champ-bloc">
              <label htmlFor="heure">Heure de début</label>
              <input
                id="heure"
                name="heure"
                type="time"
                value={heure}
                onChange={(e) => setHeure(e.target.value)}
              />
            </div>
          </div>
          <div className="champ-bloc">
            <label htmlFor="lieu">Lieu / Adresse *</label>
            <input
              id="lieu"
              name="lieu"
              type="text"
              placeholder="Nom du lieu ou adresse"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="ville">Ville *</label>
            <select
              id="ville"
              name="ville"
              value={ville}
              onChange={(e) => setVille(e.target.value)}
            >
              {VILLES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Images */}
        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">3</span>
            <h2>Images</h2>
          </div>
          <p className="aide-affiche">
            Format paysage 1,91:1 recommandé (1200×628 ou 1600×838px) pour
            l&apos;image principale. Garde le sujet centré, avec une marge de
            sécurité d&apos;environ 20% sur les côtés, et évite de placer des
            éléments importants tout en bas de l&apos;image — elle est
            recadrée différemment selon les écrans (voir les aperçus
            ci-contre). Les autres images sont affichées en carrousel sur la
            page événement.
          </p>
          <SelecteurImages onApercuPrincipalChange={setApercuPrincipal} />
        </div>

        {/* 4. Billetterie */}
        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">4</span>
            <h2>Billetterie</h2>
          </div>
          {tickets.map((t, i) => (
            <div className="type-b" key={i}>
              <div className="haut-b">
                <input
                  className="n"
                  type="text"
                  placeholder="Nom du billet (ex : Standard)"
                  value={t.nom}
                  onChange={(e) => majTicket(i, "nom", e.target.value)}
                />
                {tickets.length > 1 && (
                  <button type="button" onClick={() => retirerTicket(i)}>
                    Supprimer
                  </button>
                )}
              </div>
              <div className="rangee">
                <div className="champ-bloc">
                  <label>Prix (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={t.prix}
                    onChange={(e) => majTicket(i, "prix", e.target.value)}
                  />
                </div>
                <div className="champ-bloc">
                  <label>Quantité</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="100"
                    value={t.quantite}
                    onChange={(e) => majTicket(i, "quantite", e.target.value)}
                  />
                </div>
                <div className="champ-bloc">
                  <label>Vente jusqu&apos;au</label>
                  <input
                    type="date"
                    value={t.venteJusqua}
                    onChange={(e) => majTicket(i, "venteJusqua", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="ajout-type" onClick={ajouterTicket}>
            + Ajouter un type de billet
          </button>
        </div>
      </div>

      {/* Colonne latérale : aperçu + checklist */}
      <aside className="cote-cr">
        <div className="apercu" aria-label="Aperçu de la carte événement">
          <p className="titre-a">Aperçu</p>
          <div className="visuel-a">
            {apercuPrincipal && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercuPrincipal} alt="" />
            )}
            <span className="badge-a">{categories[0] || "Catégorie"}</span>
          </div>
          <div className="infos-a">
            <h3>{titre || "Nom de l'événement"}</h3>
            <p className="m">
              📅 {dateApercu}
              {heure ? ` · ${heure}` : ""} &nbsp;·&nbsp; 📍 {lieu || "Lieu"},{" "}
              {ville}
            </p>
            <p className="p">
              {prixMin !== null ? `à partir de ${fmt(prixMin)}` : "Tarifs à définir"}
            </p>
          </div>
        </div>

        <div className="apercu-banniere" aria-label="Aperçu du recadrage sur la page événement">
          <p className="apercu-banniere-titre">
            Aperçu bannière (page événement, grand écran)
          </p>
          <div className="apercu-banniere-visuel">
            {apercuPrincipal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercuPrincipal} alt="" />
            ) : (
              <span className="apercu-banniere-vide">Aucune image</span>
            )}
          </div>
          <p className="apercu-banniere-note">
            Sur mobile, une portion plus haute de l&apos;image reste visible.
          </p>
        </div>

        <div className="checklist">
          <h3>Checklist publication</h3>
          {(
            [
              ["Nom de l'événement", check.titre],
              ["Description", check.description],
              ["Date", check.date],
              ["Lieu & ville", check.lieu],
              ["Catégories", categories.length > 0],
              ["Images", check.affiche],
              ["Billetterie", check.billetterie],
            ] as [string, boolean][]
          ).map(([label, ok]) => (
            <div className={`item-c ${ok ? "fait" : "manque"}`} key={label}>
              <span className="etat">{ok ? "✓" : "!"}</span> {label}
            </div>
          ))}
        </div>

        <BoutonPublier actif={valide} />
        <p className="brouillon">
          Ton événement sera publié immédiatement et visible par tous.
        </p>
      </aside>
    </form>
  );
}
