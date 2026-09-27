"use client";

import s from "../espace.module.css";
import Icon from "../../Icon";
import { COMMISSION, montant, nombre } from "../orga/_orga";

export type TarifSaisi = { cle: string; nom: string; prix: string; quantite: string; venteJusqua: string };

export const nouveauTarif = (nom = ""): TarifSaisi => ({ cle: Math.random().toString(36).slice(2), nom, prix: "", quantite: "", venteJusqua: "" });

/** Erreurs d'un tarif, mêmes règles que publierEvenement : nom, prix ≥ 0 entier, quantité ≥ 1. */
export function erreursTarif(t: TarifSaisi, finEvenement: string | null) {
  const prix = Number(t.prix);
  const quantite = Number(t.quantite);
  return {
    nom: !t.nom.trim(),
    prix: t.prix === "" || !Number.isInteger(prix) || prix < 0,
    quantite: t.quantite === "" || !Number.isInteger(quantite) || quantite < 1,
    venteJusqua: !!t.venteJusqua && !!finEvenement && t.venteJusqua > finEvenement,
  };
}
export const tarifValide = (t: TarifSaisi, fin: string | null) => !Object.values(erreursTarif(t, fin)).some(Boolean);

/**
 * Bloc Billetterie (preview V2). Tous les tarifs saisis doivent être complets :
 * en prod, un tarif à moitié rempli est écarté sans prévenir (voir compte rendu).
 */
export default function Billets({
  tarifs,
  setTarifs,
  tente,
  debut,
  fin,
  min,
}: {
  tarifs: TarifSaisi[];
  setTarifs: (f: (prev: TarifSaisi[]) => TarifSaisi[]) => void;
  tente: boolean;
  debut: string;
  fin: string | null;
  min: string;
}) {
  const maj = (cle: string, champ: keyof TarifSaisi, val: string) => setTarifs((prev) => prev.map((t) => (t.cle === cle ? { ...t, [champ]: val } : t)));
  const valides = tarifs.filter((t) => tarifValide(t, fin));
  const places = valides.reduce((n, t) => n + Number(t.quantite), 0);
  const brut = valides.reduce((n, t) => n + Number(t.prix) * Number(t.quantite), 0);

  return (
    <>
      {tarifs.map((t, i) => {
        const err = erreursTarif(t, fin);
        const voir = (k: keyof typeof err) => err[k] && (tente || (k === "venteJusqua" && !!t.venteJusqua));
        const prix = Number(t.prix);
        const id = (c: string) => `t-${t.cle}-${c}`;
        return (
          <fieldset key={t.cle} className={s.ticket} style={{ border: 0, margin: 0, minWidth: 0 }}>
            <legend className={s.srOnly}>Tarif {i + 1}</legend>
            <div className={s.ticketTete}>
              <div className={`${s.champ} ${voir("nom") ? s.champErreur : ""}`}>
                <label htmlFor={id("nom")}>Nom du tarif</label>
                <input
                  id={id("nom")}
                  type="text"
                  placeholder="Ex : Standard, VIP, Prévente"
                  value={t.nom}
                  maxLength={60}
                  aria-invalid={voir("nom")}
                  onChange={(e) => maj(t.cle, "nom", e.target.value)}
                />
              </div>
              {tarifs.length > 1 && (
                <button
                  type="button"
                  className={`${s.btn} ${s.btnGris}`}
                  style={{ alignSelf: "end", width: 48, padding: 0 }}
                  aria-label={`Supprimer le tarif ${t.nom.trim() || i + 1}`}
                  onClick={() => setTarifs((prev) => prev.filter((x) => x.cle !== t.cle))}
                >
                  <Icon name="x" size={20} />
                </button>
              )}
            </div>
            {voir("nom") && <span className={s.erreur}>Donne un nom à ce tarif.</span>}

            <div className={s.deux}>
              <div className={`${s.champ} ${voir("prix") ? s.champErreur : ""}`}>
                <label htmlFor={id("prix")}>
                  Prix <small>(FCFA)</small>
                </label>
                <input
                  id={id("prix")}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0 = gratuit"
                  value={t.prix}
                  aria-invalid={voir("prix")}
                  aria-describedby={id("prix-aide")}
                  onChange={(e) => maj(t.cle, "prix", e.target.value)}
                />
              </div>
              <div className={`${s.champ} ${voir("quantite") ? s.champErreur : ""}`}>
                <label htmlFor={id("quantite")}>Places</label>
                <input
                  id={id("quantite")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="100"
                  value={t.quantite}
                  aria-invalid={voir("quantite")}
                  onChange={(e) => maj(t.cle, "quantite", e.target.value)}
                />
              </div>
            </div>
            {voir("prix") || voir("quantite") ? (
              <span id={id("prix-aide")} className={s.erreur}>
                {voir("prix") ? "Indique un prix en FCFA (0 pour un billet gratuit)." : "Indique au moins 1 place."}
              </span>
            ) : (
              <span id={id("prix-aide")} className={s.aide}>
                {t.prix === "" || err.prix
                  ? `Commission de ${Math.round(COMMISSION * 100)} % sur les billets payants, rien sur les billets gratuits.`
                  : prix === 0
                    ? "Billet gratuit : aucune commission, réservation sans paiement."
                    : `Tu reçois ${montant(Math.round(prix * (1 - COMMISSION)))} par billet (${Math.round(COMMISSION * 100)} % de commission).`}
              </span>
            )}

            <div className={`${s.champ} ${voir("venteJusqua") ? s.champErreur : ""}`}>
              <label htmlFor={id("vente")}>
                Vente jusqu&apos;au <small>(facultatif)</small>
              </label>
              <input
                id={id("vente")}
                type="date"
                min={min}
                max={fin ?? undefined}
                value={t.venteJusqua}
                aria-invalid={voir("venteJusqua")}
                onChange={(e) => maj(t.cle, "venteJusqua", e.target.value)}
              />
              {voir("venteJusqua") ? (
                <span className={s.erreur}>La vente doit s&apos;arrêter au plus tard le jour de l&apos;événement.</span>
              ) : (
                <span className={s.aide}>
                  {debut ? "Sans date, la vente reste ouverte jusqu'à l'événement ou jusqu'à épuisement." : "Sans date, la vente reste ouverte jusqu'à épuisement."}
                </span>
              )}
            </div>
          </fieldset>
        );
      })}

      <button type="button" className={s.ajout} onClick={() => setTarifs((prev) => [...prev, nouveauTarif()])}>
        <Icon name="plus" size={16} /> Ajouter un tarif
      </button>

      {valides.length > 0 && (
        <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
          <dt>Places en vente</dt>
          <dd className={s.chiffre}>{nombre(places)}</dd>
          <dt>Si tout est vendu</dt>
          <dd className={s.chiffre}>
            {brut === 0 ? (
              "Billetterie gratuite"
            ) : (
              <>
                <span className={s.montantOr}>{montant(Math.round(brut * (1 - COMMISSION)))}</span> pour toi · {montant(brut)} de ventes
              </>
            )}
          </dd>
        </dl>
      )}
    </>
  );
}
