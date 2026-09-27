"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { COMMISSION, OPERATEURS, montant, nombre } from "./_orga";

/**
 * Demande de virement en deux étapes (saisie puis confirmation), comme
 * components/orga/DemandeVirement.tsx. Feuille collée en bas sur mobile.
 * État local uniquement : aucun appel réseau.
 */
export default function DemandeVirement({
  titre,
  disponible,
  peutDemander,
  disponibleLe,
  grand = false,
  libelle = "Demander un virement",
}: {
  titre: string;
  disponible: number;
  peutDemander: boolean;
  disponibleLe?: string;
  grand?: boolean;
  libelle?: string;
}) {
  const [ouverte, setOuverte] = useState(false);
  const [etape, setEtape] = useState<"saisie" | "confirmation" | "envoye">("saisie");
  const [valeur, setValeur] = useState(String(disponible));
  const [moyen, setMoyen] = useState(OPERATEURS[0]);
  const [numero, setNumero] = useState("");

  const chiffres = numero.replace(/\D/g, "");
  const numeroOk = chiffres.length === 8 || (chiffres.length === 10 && chiffres.startsWith("01"));
  const numeroAffiche = numeroOk ? (chiffres.length === 8 ? `01${chiffres}` : chiffres).replace(/(\d{2})(?=\d)/g, "$1 ") : numero;
  const n = Number(valeur);
  const montantOk = n > 0 && n <= disponible;

  function fermer() {
    setOuverte(false);
    setEtape("saisie");
  }

  if (!peutDemander) {
    return (
      <span className={s.note} style={{ position: "relative", zIndex: 1 }}>
        Virement possible dès le {disponibleLe}
      </span>
    );
  }

  return (
    <>
      <button type="button" className={`${s.btn} ${s.btnOr} ${grand ? s.btnGrand : ""}`} onClick={() => setOuverte(true)}>
        <Icon name="wallet" /> {libelle}
      </button>

      {ouverte && (
        <div className={s.fond} onClick={fermer}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-virement" onClick={(e) => e.stopPropagation()}>
            {etape === "saisie" && (
              <>
                <div>
                  <h2 id="titre-virement" className={s.feuilleTitre}>
                    Virement
                  </h2>
                  <p className={s.feuilleTexte}>{titre}</p>
                </div>
                <div className={s.recap}>
                  <div>
                    <span>Solde disponible</span>
                    <b className={s.montantOr}>{montant(disponible)}</b>
                  </div>
                  <p className={s.aide}>Net de la commission de {Math.round(COMMISSION * 100)} %.</p>
                </div>
                <div className={s.champ}>
                  <label htmlFor="v-montant">Montant (FCFA)</label>
                  <input id="v-montant" type="number" inputMode="numeric" min={1} max={disponible} value={valeur} onChange={(e) => setValeur(e.target.value)} />
                  {!montantOk && <span className={s.erreur}>Entre 1 et {nombre(disponible)} FCFA.</span>}
                </div>
                <div className={s.champ}>
                  <span className={s.etiquette}>Moyen de paiement</span>
                  <div className={s.puces} role="radiogroup" aria-label="Moyen de paiement">
                    {OPERATEURS.map((o) => (
                      <button key={o} type="button" role="radio" aria-checked={moyen === o} className={`${s.puce} ${moyen === o ? s.puceOn : ""}`} onClick={() => setMoyen(o)}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={s.champ}>
                  <label htmlFor="v-numero">
                    Numéro {moyen} <small>(où recevoir l&apos;argent)</small>
                  </label>
                  <input id="v-numero" type="tel" inputMode="tel" placeholder="01 97 00 00 00" value={numero} onChange={(e) => setNumero(e.target.value)} />
                  <span className={s.aide}>10 chiffres commençant par 01, ou 8 chiffres (01 ajouté automatiquement).</span>
                </div>
                <div className={s.feuilleActions}>
                  <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={fermer}>
                    Annuler
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={!montantOk || !numeroOk} onClick={() => setEtape("confirmation")}>
                    Continuer
                  </button>
                </div>
              </>
            )}

            {etape === "confirmation" && (
              <>
                <h2 id="titre-virement" className={s.feuilleTitre}>
                  Confirmer le virement
                </h2>
                <div className={s.recap}>
                  <div>
                    <span>Montant</span>
                    <b className={s.montantOr}>{montant(n)}</b>
                  </div>
                  <div>
                    <span>Moyen</span>
                    <b>{moyen}</b>
                  </div>
                  <div>
                    <span>Numéro</span>
                    <b>{numeroAffiche}</b>
                  </div>
                </div>
                <p className={s.alerte} style={{ marginBottom: 0 }}>
                  <Icon name="alert" />
                  Vérifie bien ce numéro : c&apos;est là que l&apos;argent sera envoyé.
                </p>
                <div className={s.feuilleActions}>
                  <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={() => setEtape("saisie")}>
                    <Icon name="back" /> Modifier
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setEtape("envoye")}>
                    Confirmer l&apos;envoi
                  </button>
                </div>
              </>
            )}

            {etape === "envoye" && (
              <>
                <Icon name="check" size={48} className={s.montantOr} />
                <h2 id="titre-virement" className={s.feuilleTitre}>
                  Demande envoyée
                </h2>
                <p className={s.feuilleTexte}>
                  <strong>{montant(n)}</strong> vers {moyen} {numeroAffiche}. Tu suis son traitement dans Mes reversements.
                </p>
                <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={fermer}>
                  Fermer
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
