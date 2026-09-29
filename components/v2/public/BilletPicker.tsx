"use client";

import { useState } from "react";
import Icon from "../Icon";
import { fcfa, MAX_PAR_TARIF } from "./evenement";

type Tarif = { id: string; nom: string; prix: number; disponibles: number };
type Styles = Record<string, string>;

/**
 * Sélecteur de billets de la page événement (V2), repris de la preview
 * (preview-design/BilletPicker.tsx). État local seulement : le panier part
 * dans l'adresse de /evenement/[slug]/commande, où tout est revérifié par
 * le serveur. Sous le prix : « Épuisé », ou « Plus que N » à 10 places ou
 * moins. « Partager » : feuille de partage native (WhatsApp…), sinon copie
 * du lien.
 */
export default function BilletPicker({ tarifs, s, commande, titre }: { tarifs: Tarif[]; s: Styles; commande: string; titre: string }) {
  const [q, setQ] = useState<Record<string, number>>({});
  const [copie, setCopie] = useState(false);
  const total = tarifs.reduce((somme, t) => somme + (q[t.id] ?? 0) * t.prix, 0);
  const n = Object.values(q).reduce((a, b) => a + b, 0);
  const plafond = (t: Tarif) => Math.min(MAX_PAR_TARIF, t.disponibles);
  const change = (t: Tarif, d: number) => setQ((p) => ({ ...p, [t.id]: Math.max(0, Math.min(plafond(t), (p[t.id] ?? 0) + d)) }));
  const gratuit = n > 0 && total === 0;
  const libelle = gratuit ? "Réserver gratuitement" : "Payer en Mobile Money";
  const icone = gratuit ? "ticket" : "phone";

  async function partager() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titre, url });
      } catch {
        // Partage annulé : rien à faire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papiers indisponible : cas rare, pas de repli.
    }
  }

  return (
    <>
      {tarifs.length === 0 ? (
        <p className={s.texte}>Aucun billet en vente pour le moment.</p>
      ) : (
        <ul className={s.liste}>
          {tarifs.map((t) => {
            const epuise = t.disponibles === 0;
            return (
              <li key={t.id} className={`${s.ligneTarif} ${(q[t.id] ?? 0) > 0 ? s.ligneOn : ""}`}>
                <div>
                  <div className={s.tarifNom}>{t.nom}</div>
                  {epuise ? <div className={s.tarifDetail}>Épuisé</div> : t.disponibles <= 10 && <div className={s.tarifDetail}>Plus que {t.disponibles}</div>}
                  <div className={s.tarifPrix}>{fcfa(t.prix)}</div>
                </div>
                <div className={s.stepper}>
                  <button type="button" className={s.btn} aria-label={`Retirer un billet ${t.nom}`} onClick={() => change(t, -1)} disabled={!(q[t.id] > 0)}>
                    <Icon name="minus" />
                  </button>
                  <span className={s.qte} aria-live="polite">
                    {q[t.id] ?? 0}
                  </span>
                  <button type="button" className={s.btn} aria-label={`Ajouter un billet ${t.nom}`} onClick={() => change(t, 1)} disabled={(q[t.id] ?? 0) >= plafond(t)}>
                    <Icon name="plus" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className={s.barre}>
        <div className={s.total}>
          <span className={s.totalLabel}>{n > 0 ? `${n} billet${n > 1 ? "s" : ""}` : "Total"}</span>
          <span className={s.totalMontant}>{n > 0 ? fcfa(total) : "—"}</span>
        </div>
        {n > 0 ? (
          <a className={s.cta} href={`${commande}?${new URLSearchParams(Object.entries(q).filter(([, x]) => x > 0).map(([k, x]) => [k, String(x)]))}`}>
            <Icon name={icone} size={20} />
            {libelle}
          </a>
        ) : (
          <button type="button" className={s.cta} disabled>
            <Icon name={icone} size={20} />
            {libelle}
          </button>
        )}
      </div>
      <button type="button" className={s.partager} onClick={partager}>
        <Icon name={copie ? "check" : "link"} />
        {copie ? "Lien copié" : "Partager l'événement"}
      </button>
    </>
  );
}
