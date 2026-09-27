"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";

const MAX = 80; // MAX_LONGUEUR_NOM_PUBLIC en prod

/**
 * Nom public avec aperçu en direct de la mention « Organisé par ».
 * Vide = nom personnel affiché (comme en prod). Aucun appel réseau.
 */
export default function NomPublic({ nomPerso, initial, erreur }: { nomPerso: string; initial: string; erreur: boolean }) {
  const [valeur, setValeur] = useState(initial);
  const [sauve, setSauve] = useState(initial);
  const [enregistre, setEnregistre] = useState(false);
  const affiche = valeur.trim() || nomPerso;
  const modifie = valeur.trim() !== sauve.trim();

  return (
    <form
      className={s.formSimple}
      onSubmit={(e) => {
        e.preventDefault();
        setSauve(valeur.trim());
        setEnregistre(true);
      }}
    >
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
          <Icon name="alert" />
          <span>Une erreur est survenue, réessaie.</span>
        </p>
      )}
      {enregistre && !modifie && (
        <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
          <Icon name="check" />
          <span>Nom public enregistré. Il apparaît déjà sur tes événements.</span>
        </p>
      )}

      <div className={s.champ}>
        <label htmlFor="nom_public">Nom public</label>
        <input
          id="nom_public"
          name="nom_public"
          type="text"
          maxLength={MAX}
          placeholder={nomPerso}
          value={valeur}
          autoComplete="organization"
          onChange={(e) => {
            setValeur(e.target.value);
            setEnregistre(false);
          }}
        />
        <span className={s.aide}>
          Le nom de ta structure ou de ton collectif. Laisse vide pour afficher ton nom personnel. {valeur.length}/{MAX}
        </span>
      </div>

      <div>
        <span className={s.etiquette}>Aperçu sur la page d&apos;un événement</span>
        <p className={s.verrou} style={{ marginTop: 6, color: "inherit" }}>
          <Icon name="users" size={20} />
          <span>
            <span className={s.note} style={{ display: "block" }}>
              Organisé par
            </span>
            <b>{affiche}</b>
          </span>
        </p>
      </div>

      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={!modifie}>
        Enregistrer
      </button>
    </form>
  );
}
