import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recupererTransaction } from "@/lib/fedapay";
import { finaliserCommande } from "@/lib/commandes";
import { issueTransaction } from "@/lib/statut-paiement";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header } from "@/components/v2/public/Chrome";
import Verification from "@/components/v2/compte/Verification";
import NonAbouti from "@/components/v2/compte/NonAbouti";
import { fcfa } from "@/components/v2/public/evenement";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Vérification du paiement — XwézanEvent", robots: { index: false } };

// Chaque visite (et chaque revérification de l'écran d'attente) réinterroge FedaPay.
export const dynamic = "force-dynamic";

/** Transaction « pending » depuis plus longtemps : considérée non aboutie, l'acheteur peut recommencer. */
const DELAI_NON_ABOUTI_MS = 15 * 60 * 1000;

/**
 * Retour navigateur depuis le checkout FedaPay (V2). Comme il n'y a pas de
 * signature ici, on vérifie l'état RÉEL de la transaction via l'API avant de
 * finaliser (le webhook reste la source de vérité ; finaliserCommande est
 * idempotent). Seuls « approved »/« transferred » valent succès
 * (lib/statut-paiement.ts).
 *
 * Issues : payée → /confirmation ; refusée ou annulée → /paiement/echec avec
 * le motif ; expirée → /paiement/echec (motif générique, relance possible).
 * Tout le reste (pending, statut inconnu, vérification impossible) : écran
 * d'attente qui revérifie, sans jamais proposer de repayer (BUGS_REFONTE n°12,
 * maquetté dans la preview v2/paiement/retour). Avant la V2, ces cas
 * partaient sur /paiement/echec?raison=en_attente.
 *
 * Exception, « pending » non abouti (BUGS_REFONTE n°25) : quand l'acheteur
 * annule sur la page FedaPay, FedaPay revient ici avec close=true et laisse
 * la transaction « pending » 24 h. Dans ce cas, ou après 15 min de
 * « pending », écran « Paiement non abouti » avec « Recommencer l'achat »
 * (nouvelle commande, l'ancienne n'est pas touchée). close n'est pas signé :
 * il ne change que l'écran affiché, jamais l'état d'une commande.
 */
export default async function RetourPaiement({ searchParams }: { searchParams: { order?: string; close?: string } }) {
  const orderId = searchParams.order;
  if (!orderId) redirect("/compte");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, statut, total, user_id, fedapay_transaction_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) redirect("/compte");

  // Déjà finalisée (le webhook a été plus rapide que le retour navigateur).
  if (order.statut === "paye") {
    redirect(`/confirmation?order=${orderId}`);
  }

  // redirect() lève une exception spéciale (NEXT_REDIRECT) : on calcule la
  // destination dans le try, mais on ne l'appelle qu'APRÈS le try/catch,
  // pour ne jamais la laisser se faire avaler par notre propre catch.
  // null = issue inconnue : écran d'attente.
  let destination: string | null = null;
  let nonAbouti = false;

  if (!order.fedapay_transaction_id) {
    // Aucune transaction (FedaPay indisponible à la création) : rien ne peut
    // être en cours, la relance est la seule issue.
    destination = `/paiement/echec?order=${orderId}`;
  } else {
    try {
      const trx = await recupererTransaction(Number(order.fedapay_transaction_id));
      console.info(`[fedapay retour] commande ${orderId} → statut reçu : ${trx.status}`);

      const issue = issueTransaction(trx.status);
      if (issue === "payee") {
        await finaliserCommande(orderId, trx.amount);
        destination = `/confirmation?order=${orderId}`;
      } else if (trx.status === "declined") {
        destination = `/paiement/echec?order=${orderId}&raison=refuse`;
      } else if (trx.status === "canceled") {
        destination = `/paiement/echec?order=${orderId}&raison=annule`;
      } else if (issue === "echec_definitif") {
        // expired : la demande n'a jamais été validée, rien n'a été débité.
        destination = `/paiement/echec?order=${orderId}`;
      } else if (trx.status === "pending") {
        // Page FedaPay fermée (close=true) ou attente trop longue : non abouti.
        const ancienneteMs = trx.creeeLe ? Date.now() - new Date(trx.creeeLe).getTime() : 0;
        nonAbouti = searchParams.close === "true" || ancienneteMs > DELAI_NON_ABOUTI_MS;
      }
      // pending ou tout autre statut : écran d'attente (ou non abouti). Le
      // webhook finalisera la commande dès qu'il recevra « approved ».
    } catch (e) {
      console.error("[fedapay] vérification au retour échouée :", e);
      // Vérification impossible = on ne peut pas confirmer le succès.
    }
  }

  if (destination) redirect(destination);

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 48 }}>
        {nonAbouti ? (
          <NonAbouti orderId={order.id} total={fcfa(order.total)} compte={!!order.user_id} />
        ) : (
          <Verification total={fcfa(order.total)} compte={!!order.user_id} />
        )}
      </main>
    </div>
  );
}
