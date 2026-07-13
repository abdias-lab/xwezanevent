"use client";

import { useMemo, useState } from "react";
import type { TicketTypeDetail } from "@/lib/events";

function fmt(n: number): string {
  // toLocaleString('fr-FR') insère des espaces fines insécables : \s les
  // normalise (U+202F / U+00A0 inclus) en espaces ordinaires.
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

type Phase = "idle" | "creation" | "redirection";

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

  // Le total payé par l'acheteur est exactement le prix des billets
  // choisis : XwézanEvent n'ajoute aucun frais de service (voir /tarifs).
  const { total, totalQte, lignesChoisies } = useMemo(() => {
    let st = 0;
    let q = 0;
    const lignes: { id: string; nom: string; prix: number; qte: number }[] = [];
    for (const t of ticketTypes) {
      const n = quantites[t.id] ?? 0;
      if (n > 0) lignes.push({ id: t.id, nom: t.nom, prix: t.prix, qte: n });
      st += t.prix * n;
      q += n;
    }
    return { total: st, totalQte: q, lignesChoisies: lignes };
  }, [quantites, ticketTypes]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [erreur, setErreur] = useState<string | null>(null);
  const envoi = phase !== "idle";

  async function payer() {
    if (envoi) return; // jamais deux envois simultanés
    const items = ticketTypes
      .map((t) => ({ id: t.id, qte: quantites[t.id] ?? 0 }))
      .filter((x) => x.qte > 0);
    if (items.length === 0) return;

    setPhase("creation");
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
        setPhase("redirection");
        window.location.href = data.url; // → checkout FedaPay
        return;
      }
      if (data.orderId) {
        // Commande créée mais transaction FedaPay indisponible pour
        // l'instant : page d'échec dédiée, avec réessai sur cette même
        // commande (jamais de doublon).
        setPhase("redirection");
        window.location.href = `/paiement/echec?order=${data.orderId}&raison=indisponible`;
        return;
      }
      setErreur(data.error ?? "Une erreur est survenue.");
      setPhase("idle");
    } catch {
      setErreur("Connexion impossible. Réessaie.");
      setPhase("idle");
    }
  }

  const texteBouton =
    phase === "creation"
      ? "Création de ta commande…"
      : phase === "redirection"
        ? "Redirection vers FedaPay…"
        : totalQte > 0
          ? `Payer ${fmt(total)}`
          : "Sélectionne au moins un billet";

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
                  disabled={q === 0 || envoi}
                >
                  −
                </button>
                <span className="q">{q}</span>
                <button
                  type="button"
                  aria-label={`Ajouter un billet ${t.nom}`}
                  onClick={() => setQte(t.id, +1, t.disponibles)}
                  disabled={epuise || q >= t.disponibles || envoi}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {lignesChoisies.length > 0 && (
        <div className="totaux">
          {lignesChoisies.map((l) => (
            <div className="ligne-t" key={l.id}>
              <span>
                {l.nom} × {l.qte}
              </span>
              <span className="m">{fmt(l.prix * l.qte)}</span>
            </div>
          ))}
          <div className="ligne-t total">
            <span>Total à payer</span>
            <span className="m">{fmt(total)}</span>
          </div>
        </div>
      )}

      {erreur && <p className="note-paiement">{erreur}</p>}

      <button
        className="btn btn-or btn-large"
        type="button"
        onClick={payer}
        disabled={totalQte === 0 || envoi}
        aria-busy={envoi}
      >
        {envoi && <span className="spinner" aria-hidden="true" />}
        {texteBouton}
      </button>
      <p className="securise">
        🔒 Paiement 100&nbsp;% sécurisé via FedaPay — Mobile Money MTN, Moov,
        Celtiis
      </p>

      <div className="actions-ev">
        <button className="btn btn-ghost" type="button" disabled={envoi}>🤍 Favori</button>
        <button className="btn btn-ghost" type="button" disabled={envoi}>📤 Partager</button>
      </div>
    </aside>
  );
}
