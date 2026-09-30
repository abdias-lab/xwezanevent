"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";

/**
 * Paiement non abouti (BUGS_REFONTE n°25) : affiché par /paiement/retour
 * quand l'acheteur a fermé la page FedaPay (paramètre close=true ajouté par
 * FedaPay) ou quand la transaction est « pending » depuis plus de 15 min.
 * FedaPay laisse alors la transaction « pending » 24 h : « Recommencer
 * l'achat » crée une NOUVELLE commande (POST /api/orders/[id]/recommencer)
 * sans toucher à l'ancienne, qui reste finalisable si elle est validée
 * après coup. L'avertissement évite de payer deux fois par erreur.
 */
export default function NonAbouti({ orderId, total, compte }: { orderId: string; total: string; compte: boolean }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function recommencer() {
    if (enCours) return; // jamais deux envois simultanés
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/recommencer`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.finalisee) {
        window.location.href = `/confirmation?order=${data.orderId}`;
        return;
      }
      if (res.ok && data.url) {
        window.location.href = data.url; // → nouveau checkout FedaPay
        return;
      }
      setErreur(data.error ?? "Impossible de recommencer l'achat.");
      setEnCours(false);
    } catch {
      setErreur("Connexion impossible. Réessaie.");
      setEnCours(false);
    }
  }

  return (
    <div className={s.vide} style={{ maxWidth: 520, margin: "0 auto" }} aria-live="polite">
      <Icon name="x" size={48} className={s.montantOr} />
      <p className={s.videTitre}>Paiement non abouti</p>
      <p className={s.videTexte}>Ta commande de {total} n&apos;a pas été payée. Tu peux recommencer ton achat maintenant.</p>
      <p className={s.alerte} style={{ textAlign: "left", marginBottom: 0 }}>
        <Icon name="alert" />
        <span>
          <b>Tu as validé le paiement sur ton téléphone ?</b> Ne recommence pas : tes billets arrivent par e-mail dès que FedaPay confirme.
        </span>
      </p>
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0, textAlign: "left" }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}
      <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 360 }}>
        <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours} onClick={recommencer}>
          <Icon name="repeat" /> {enCours ? "Redirection vers FedaPay…" : "Recommencer l'achat"}
        </button>
        <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => router.refresh()}>
          Vérifier à nouveau
        </button>
        {/* Acheteur invité : pas de compte, ses billets se retrouvent par e-mail. */}
        <Link href={compte ? "/compte" : "/billet"} className={s.note} style={{ textDecoration: "underline", justifySelf: "center" }}>
          {compte ? "Voir mes commandes" : "Retrouver mon billet"}
        </Link>
      </div>
    </div>
  );
}
