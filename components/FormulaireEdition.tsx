"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import SelecteurCategories from "@/components/SelecteurCategories";
import SelecteurImages from "@/components/SelecteurImages";

function BoutonEnregistrer() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-or btn-large" type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer les modifications"}
    </button>
  );
}

/**
 * Édition d'un événement déjà publié : description, date, heure, images,
 * catégories uniquement — titre/lieu/ville figés (affichés en lecture
 * seule) car dans le slug déjà indexé et imprimés sur les billets déjà
 * vendus. Pays figé pour la même raison, plus fort encore : il détermine
 * les opérateurs Mobile Money proposés au reversement (voir la suite du
 * chantier multi-pays) — le changer après coup risquerait d'incohérences
 * avec des commandes déjà payées. Réutilise SelecteurCategories/
 * SelecteurImages, partagés avec la création (components/FormulaireCreation.tsx).
 */
export default function FormulaireEdition({
  action,
  titre,
  lieu,
  ville,
  pays,
  description: descriptionInitiale,
  dateDebut: dateDebutInitiale,
  heure: heureInitiale,
  categoriesInitiales,
  imagesInitiales,
}: {
  action: (formData: FormData) => void;
  titre: string;
  lieu: string;
  ville: string;
  /** "🇧🇯 Bénin" ou null si la ligne pays n'a pas pu être chargée — affiché en lecture seule, jamais modifiable ici (voir plus bas). */
  pays: string | null;
  description: string;
  dateDebut: string;
  heure: string;
  categoriesInitiales: string[];
  imagesInitiales: { url: string }[];
}) {
  const [description, setDescription] = useState(descriptionInitiale);
  const [dateDebut, setDateDebut] = useState(dateDebutInitiale);
  const [heure, setHeure] = useState(heureInitiale);
  const [categories, setCategories] = useState<string[]>(categoriesInitiales);

  return (
    <form className="corps-cr" action={action} encType="multipart/form-data">
      <div>
        <span className="eyebrow">Espace organisateur</span>
        <h1 style={{ marginTop: 12 }}>Modifier « {titre} »</h1>
        <p className="sous">
          {pays ? `${pays} · ` : ""}📍 {lieu}, {ville} — le nom, le pays, le lieu et la
          ville ne sont pas modifiables ici.
        </p>

        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">1</span>
            <h2>Informations générales</h2>
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

        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">2</span>
            <h2>Date &amp; heure</h2>
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
          <p className="aide-affiche">
            ⚠ Si tu changes la date, tous les acheteurs ayant déjà un billet
            payé pour cet événement seront notifiés automatiquement par
            email. Un changement d&apos;heure seule ne les notifie pas.
          </p>
        </div>

        <div className="bloc-form">
          <div className="num-titre">
            <span className="num">3</span>
            <h2>Images</h2>
          </div>
          <SelecteurImages imagesInitiales={imagesInitiales} />
        </div>
      </div>

      <aside className="cote-cr">
        <BoutonEnregistrer />
        <p className="brouillon">
          Les modifications sont visibles immédiatement, sans repasser par
          la validation.
        </p>
      </aside>
    </form>
  );
}
