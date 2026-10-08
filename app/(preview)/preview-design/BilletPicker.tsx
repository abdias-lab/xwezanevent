"use client";

import { useState } from "react";
import Icon from "./Icon";
import { fcfa } from "./_data";

type Tarif = { id: string; nom: string; detail: string; prix: number; venteTerminee?: boolean };
type Styles = Record<string, string>;

/**
 * Sélecteur de billets : état local uniquement, aucun appel réseau.
 * `commande` (facultatif, V2) : page de commande, le panier y est passé en paramètres.
 * `venteTerminee` (V2, BUGS_REFONTE n°10) : tarif clos, grisé et non achetable.
 */
export default function BilletPicker({ tarifs, s, commande }: { tarifs: Tarif[]; s: Styles; commande?: string }) {
  const [q, setQ] = useState<Record<string, number>>({});
  const total = tarifs.reduce((somme, t) => somme + (q[t.id] ?? 0) * t.prix, 0);
  const n = Object.values(q).reduce((a, b) => a + b, 0);
  const change = (id: string, d: number) => setQ((p) => ({ ...p, [id]: Math.max(0, Math.min(10, (p[id] ?? 0) + d)) }));

  return (
    <>
      <ul className={s.liste}>
        {tarifs.map((t) => (
          <li key={t.id} className={`${s.ligneTarif} ${(q[t.id] ?? 0) > 0 ? s.ligneOn : ""} ${t.venteTerminee ? s.ligneOff ?? "" : ""}`}>
            <div>
              <div className={s.tarifNom}>{t.nom}</div>
              <div className={s.tarifDetail}>{t.detail}</div>
              <div className={s.tarifPrix}>{fcfa(t.prix)}</div>
            </div>
            <div className={s.stepper}>
              <button type="button" className={s.btn} aria-label={`Retirer un billet ${t.nom}`} onClick={() => change(t.id, -1)} disabled={!(q[t.id] > 0)}>
                <Icon name="minus" />
              </button>
              <span className={s.qte} aria-live="polite">
                {q[t.id] ?? 0}
              </span>
              <button type="button" className={s.btn} aria-label={`Ajouter un billet ${t.nom}`} onClick={() => change(t.id, 1)} disabled={t.venteTerminee}>
                <Icon name="plus" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className={s.barre}>
        <div className={s.total}>
          <span className={s.totalLabel}>{n > 0 ? `${n} billet${n > 1 ? "s" : ""}` : "Total"}</span>
          <span className={s.totalMontant}>{n > 0 ? fcfa(total) : "—"}</span>
        </div>
        {commande && n > 0 ? (
          <a className={s.cta} href={`${commande}?${new URLSearchParams(Object.entries(q).filter(([, x]) => x > 0).map(([k, x]) => [k, String(x)]))}`}>
            <Icon name="phone" size={20} />
            Payer en Mobile Money
          </a>
        ) : (
          <button type="button" className={s.cta} disabled={n === 0}>
            <Icon name="phone" size={20} />
            Payer en Mobile Money
          </button>
        )}
      </div>
    </>
  );
}
