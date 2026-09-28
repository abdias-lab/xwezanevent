"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { montant, nombre } from "../format";
import { normaliserNumero, operateursPays, aidePays, exemplePays, formaterNumero } from "@/lib/telephone";

/**
 * Demande de virement en deux étapes (saisie puis confirmation), design de
 * la preview (v2/orga/DemandeVirement.tsx), logique de la prod
 * (components/orga/DemandeVirement.tsx) : opérateurs et format de numéro
 * selon le pays de l'événement, POST /api/orga/events/[id]/payouts qui
 * revérifie solde et J+3. Feuille collée en bas sur mobile.
 */
export default function DemandeVirement({
  eventId,
  titre,
  disponible,
  tauxCommission,
  paysCode,
  peutDemander,
  disponibleLe,
  grand = false,
  libelle = "Demander un virement",
}: {
  eventId: string;
  titre: string;
  disponible: number;
  /** events.taux_commission (8 % par défaut, 0 sur accord). */
  tauxCommission: number;
  /** events.pays_code : opérateurs proposés et format de numéro (lib/telephone.ts). */
  paysCode: string;
  /** Calculé côté serveur (lib/payouts.ts, server-only), jamais recalculé ici. */
  peutDemander: boolean;
  /** Date déjà formatée côté serveur. */
  disponibleLe?: string;
  grand?: boolean;
  libelle?: string;
}) {
  const router = useRouter();
  const operateurs = operateursPays(paysCode);
  const [ouverte, setOuverte] = useState(false);
  const [etape, setEtape] = useState<"saisie" | "confirmation" | "envoye">("saisie");
  const [valeur, setValeur] = useState(String(disponible));
  const [moyen, setMoyen] = useState(operateurs[0]?.code ?? "");
  const [numero, setNumero] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nomMoyen = operateurs.find((o) => o.code === moyen)?.nom ?? moyen;
  const numeroNormalise = normaliserNumero(paysCode, numero);
  const numeroAffiche = numeroNormalise ? formaterNumero(numeroNormalise) : numero;
  const n = Number(valeur);
  const montantOk = Number.isInteger(n) && n > 0 && n <= disponible;

  function fermer() {
    if (enCours) return;
    const envoye = etape === "envoye";
    setOuverte(false);
    setEtape("saisie");
    setErreur(null);
    // Rafraîchi à la fermeture seulement : pendant la feuille, la ligne (et
    // donc ce composant) resterait sinon démontée dès que le solde tombe à 0.
    if (envoye) router.refresh();
  }

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orga/events/${eventId}/payouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montant: n, moyen, numero }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Erreur");
        setEtape("saisie");
      } else {
        setEtape("envoye");
      }
    } catch {
      setErreur("Erreur réseau");
      setEtape("saisie");
    }
    setEnCours(false);
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
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-virement-${eventId}`} onClick={(e) => e.stopPropagation()}>
            {etape === "saisie" && (
              <>
                <div>
                  <h2 id={`titre-virement-${eventId}`} className={s.feuilleTitre}>
                    Virement
                  </h2>
                  <p className={s.feuilleTexte}>{titre}</p>
                </div>
                <div className={s.recap}>
                  <div>
                    <span>Solde disponible</span>
                    <b className={s.montantOr}>{montant(disponible)}</b>
                  </div>
                  <p className={s.aide}>
                    {tauxCommission > 0 ? `Net de la commission de ${Math.round(tauxCommission * 100)}\u00A0%.` : "Aucune commission sur cet événement."}
                  </p>
                </div>
                <div className={s.champ}>
                  <label htmlFor={`v-montant-${eventId}`}>Montant (FCFA)</label>
                  <input id={`v-montant-${eventId}`} type="number" inputMode="numeric" min={1} max={disponible} value={valeur} onChange={(e) => setValeur(e.target.value)} />
                  {!montantOk && <span className={s.erreur}>Entre 1 et {nombre(disponible)} FCFA.</span>}
                </div>
                <div className={s.champ}>
                  <span className={s.etiquette}>Moyen de paiement</span>
                  <div className={s.puces} role="radiogroup" aria-label="Moyen de paiement">
                    {operateurs.map((o) => (
                      <button key={o.code} type="button" role="radio" aria-checked={moyen === o.code} className={`${s.puce} ${moyen === o.code ? s.puceOn : ""}`} onClick={() => setMoyen(o.code)}>
                        {o.nom}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={s.champ}>
                  <label htmlFor={`v-numero-${eventId}`}>
                    Numéro {nomMoyen} <small>(où recevoir l&apos;argent)</small>
                  </label>
                  <input id={`v-numero-${eventId}`} type="tel" inputMode="tel" placeholder={exemplePays(paysCode)} value={numero} onChange={(e) => setNumero(e.target.value)} />
                  <span className={s.aide}>{aidePays(paysCode)}</span>
                </div>
                {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
                {erreur && (
                  <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                    <Icon name="alert" />
                    <span>{erreur}</span>
                  </p>
                )}
                <div className={s.feuilleActions}>
                  <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} onClick={fermer}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
                    disabled={!montantOk || !numeroNormalise}
                    onClick={() => {
                      setErreur(null);
                      setEtape("confirmation");
                    }}
                  >
                    Continuer
                  </button>
                </div>
              </>
            )}

            {etape === "confirmation" && (
              <>
                <h2 id={`titre-virement-${eventId}`} className={s.feuilleTitre}>
                  Confirmer le virement
                </h2>
                <div className={s.recap}>
                  <div>
                    <span>Montant</span>
                    <b className={s.montantOr}>{montant(n)}</b>
                  </div>
                  <div>
                    <span>Moyen</span>
                    <b>{nomMoyen}</b>
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
                  <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setEtape("saisie")}>
                    <Icon name="back" /> Modifier
                  </button>
                  <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={enCours} onClick={confirmer}>
                    {enCours ? "Envoi…" : "Confirmer l'envoi"}
                  </button>
                </div>
              </>
            )}

            {etape === "envoye" && (
              <>
                <Icon name="check" size={48} className={s.montantOr} />
                <h2 id={`titre-virement-${eventId}`} className={s.feuilleTitre}>
                  Demande envoyée
                </h2>
                <p className={s.feuilleTexte}>
                  <strong>{montant(n)}</strong> vers {nomMoyen} {numeroAffiche}. Tu suis son traitement dans Mes reversements.
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
