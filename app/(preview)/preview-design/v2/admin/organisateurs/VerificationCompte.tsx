"use client";

import { useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";

/** Longueur maximale de la note interne (contrainte en base, comptes_verifies.note). */
const NOTE_MAX = 500;

/**
 * Vérification d'un compte (preview V2, design/ARTISTES.md) : label ou
 * artiste auto-produit dont l'équipe a reçu les pièces hors plateforme. En
 * prod : components/v2/admin/VerificationCompte.tsx (POST
 * /api/admin/comptes/[id]/verification) ; ici, état local seulement.
 */
export default function VerificationCompte({ userId, nom, verifieLe }: { userId: string; nom: string; verifieLe: string | null }) {
  const [verifieLocal, setVerifieLocal] = useState(verifieLe !== null);
  const [ouvert, setOuvert] = useState(false);
  const [note, setNote] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const verifie = verifieLocal;

  function confirmer() {
    setEnCours(true);
    setErreur(null);
    setVerifieLocal(!verifie);
    setOuvert(false);
    setEnCours(false);
    setNote("");
  }

  return (
    <>
      <button
        type="button"
        className={`${s.btn} ${s.btnGris}`}
        style={{ justifySelf: "start" }}
        onClick={() => {
          setErreur(null);
          setOuvert(true);
        }}
      >
        <Icon name={verifie ? "x" : "shield"} size={16} /> {verifie ? "Retirer la vérification" : "Vérifier le compte"}
      </button>

      {ouvert && (
        <div className={s.fond} onClick={() => !enCours && setOuvert(false)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-verif-${userId}`} onClick={(e) => e.stopPropagation()}>
            <h2 id={`titre-verif-${userId}`} className={s.feuilleTitre}>
              {verifie ? `Retirer la vérification de « ${nom} » ?` : `Vérifier « ${nom} » ?`}
            </h2>
            {verifie ? (
              <ul className={s.checklist} style={{ color: "#fff" }}>
                <li>
                  <Icon name="check" size={16} /> Ce qui est déjà publié reste en ligne.
                </li>
                <li>
                  <Icon name="shield" size={16} /> Ses prochains artistes et événements repasseront en validation.
                </li>
                <li>
                  <Icon name="x" size={16} /> Le badge « Vérifié » disparaît de ses pages.
                </li>
              </ul>
            ) : (
              <>
                <ul className={s.checklist} style={{ color: "#fff" }}>
                  <li>
                    <Icon name="check" size={16} /> Ses artistes sont publiés sans validation.
                  </li>
                  <li>
                    <Icon name="check" size={16} /> Ses événements sont mis en ligne sans validation. Tu reçois un e-mail à chaque publication.
                  </li>
                  <li>
                    <Icon name="shield" size={16} /> Badge « Vérifié » sur ses pages artistes et sur « Organisé par ».
                  </li>
                </ul>
                <div className={s.champ}>
                  <label htmlFor={`note-verif-${userId}`}>
                    Pièces reçues <small>(interne, facultatif)</small>
                  </label>
                  <textarea
                    id={`note-verif-${userId}`}
                    value={note}
                    maxLength={NOTE_MAX}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex. statuts et mandat reçus par WhatsApp le 2 octobre"
                    style={{ minHeight: 80 }}
                  />
                </div>
                <p className={s.feuilleTexte}>Vérifie seulement un label ou un artiste dont tu as reçu les pièces. Jamais un organisateur ordinaire.</p>
              </>
            )}
            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setOuvert(false)}>
                Annuler
              </button>
              <button type="button" className={`${s.btn} ${verifie ? s.btnDanger : s.btnOr} ${s.btnGrand}`} autoFocus disabled={enCours} onClick={confirmer}>
                {enCours ? "Enregistrement…" : verifie ? "Retirer la vérification" : "Vérifier le compte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
