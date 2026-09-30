"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import s from "../espace.module.css";
import Icon from "../Icon";

const MAX = 80; // MAX_LONGUEUR_NOM_PUBLIC de app/(orga)/orga/parametres/actions.ts

function Enregistrer({ modifie }: { modifie: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={!modifie || pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

/**
 * Nom public avec aperçu en direct de la mention « Organisé par » (V2),
 * repris de la preview (v2/orga/parametres/NomPublic.tsx). Enregistrement
 * par l'action serveur de prod `majNomPublic`, qui revient sur la page avec
 * ?maj=1 ou ?erreur=1. Vide = nom personnel affiché.
 */
export default function NomPublic({
  action,
  nomPerso,
  initial,
  enregistre: enregistreInitial,
  erreur,
}: {
  action: (formData: FormData) => void;
  nomPerso: string;
  initial: string;
  enregistre: boolean;
  erreur: boolean;
}) {
  const [valeur, setValeur] = useState(initial);
  const [enregistre, setEnregistre] = useState(enregistreInitial);
  const affiche = valeur.trim() || nomPerso;
  const modifie = valeur.trim() !== initial.trim();

  return (
    <form className={s.formSimple} action={action}>
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

      <Enregistrer modifie={modifie} />
    </form>
  );
}
