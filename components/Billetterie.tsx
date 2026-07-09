"use client";

import { useMemo, useState } from "react";
import type { TicketTypeDetail } from "@/lib/events";

const FRAIS_TAUX = 0.06; // 6% de frais de service

function fmt(n: number): string {
  // toLocaleString('fr-FR') insère des espaces fines insécables : \s les
  // normalise (U+202F / U+00A0 inclus) en espaces ordinaires.
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

export default function Billetterie({
  slug,
  ticketTypes,
  limiteVente,
}: {
  slug: string;
  ticketTypes: TicketTypeDetail[];
  limiteVente?: string;
}) {
  const [quantites, setQuantites] = useState<Record<string, number>>({});

  const setQte = (id: string, delta: number, max: number) =>
    setQuantites((prev) => {
      const courant = prev[id] ?? 0;
      const suivant = Math.min(max, Math.max(0, courant + delta));
      return { ...prev, [id]: suivant };
    });

  const { sousTotal, totalQte } = useMemo(() => {
    let st = 0;
    let q = 0;
    for (const t of ticketTypes) {
      const n = quantites[t.id] ?? 0;
      st += t.prix * n;
      q += n;
    }
    return { sousTotal: st, totalQte: q };
  }, [quantites, ticketTypes]);

  const frais = Math.round(sousTotal * FRAIS_TAUX);
  const total = sousTotal + frais;

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function payer() {
    const items = ticketTypes
      .map((t) => ({ id: t.id, qte: quantites[t.id] ?? 0 }))
      .filter((x) => x.qte > 0);
    if (items.length === 0) return;

    setEnvoi(true);
    setErreur(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, items }),
      });
      if (res.status === 401) {
        window.location.href = `/connexion?redirect=/evenement/${slug}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url; // → checkout FedaPay
        return;
      }
      if (data.orderId) {
        // Commande créée mais paiement indispo : on montre la confirmation
        window.location.href = `/confirmation?order=${data.orderId}`;
        return;
      }
      setErreur(data.error ?? "Une erreur est survenue.");
    } catch {
      setErreur("Connexion impossible. Réessaie.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <aside className="billetterie" aria-label="Choisir ses billets">
      <h2>Choisis tes billets</h2>
      <p className="limite">
        {limiteVente ?? "Billets disponibles à la réservation en ligne"}
      </p>

      <div id="types">
        {ticketTypes.length === 0 && (
          <p className="limite">Aucun billet en vente pour le moment.</p>
        )}
        {ticketTypes.map((t) => {
          const q = quantites[t.id] ?? 0;
          const epuise = t.disponibles === 0;
          return (
            <div key={t.id} className={`type-billet${q > 0 ? " choisi" : ""}`}>
              <div className="d">
                <div className="n">{t.nom}</div>
                <div className="de">
                  {epuise
                    ? "Épuisé"
                    : `${t.disponibles.toLocaleString("fr-FR")} places disponibles`}
                </div>
                <div className="p">{fmt(t.prix)}</div>
              </div>
              <div className="quantite">
                <button
                  type="button"
                  aria-label={`Retirer un billet ${t.nom}`}
                  onClick={() => setQte(t.id, -1, t.disponibles)}
                  disabled={q === 0}
                >
                  −
                </button>
                <span className="q">{q}</span>
                <button
                  type="button"
                  aria-label={`Ajouter un billet ${t.nom}`}
                  onClick={() => setQte(t.id, +1, t.disponibles)}
                  disabled={epuise || q >= t.disponibles}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="totaux">
        <div className="ligne-t">
          <span>Sous-total</span>
          <span className="m">{fmt(sousTotal)}</span>
        </div>
        <div className="ligne-t">
          <span>Frais de service (6%)</span>
          <span className="m">{fmt(frais)}</span>
        </div>
        <div className="ligne-t total">
          <span>Total</span>
          <span className="m">{fmt(total)}</span>
        </div>
      </div>

      {erreur && <p className="note-paiement">{erreur}</p>}

      <button
        className="btn btn-or btn-large"
        type="button"
        onClick={payer}
        disabled={totalQte === 0 || envoi}
      >
        {envoi
          ? "Redirection…"
          : totalQte > 0
            ? `Payer ${fmt(total)}`
            : "Sélectionne au moins un billet"}
      </button>
      <p className="securise">🔒 Paiement sécurisé via FedaPay (Mobile Money / carte)</p>

      <div className="actions-ev">
        <button className="btn btn-ghost" type="button">🤍 Favori</button>
        <button className="btn btn-ghost" type="button">📤 Partager</button>
      </div>
    </aside>
  );
}
