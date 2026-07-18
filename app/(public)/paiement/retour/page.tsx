import { supabaseAdmin } from "@/lib/supabase-admin";
import { recupererTransaction } from "@/lib/fedapay";
import { finaliserCommande } from "@/lib/commandes";
import { redirect } from "next/navigation";

/**
 * Retour navigateur depuis le checkout FedaPay. Comme il n'y a pas de signature
 * ici, on vérifie l'état RÉEL de la transaction via l'API avant de finaliser
 * (le webhook reste la source de vérité ; finaliserCommande est idempotent).
 *
 * Le sandbox FedaPay s'est montré incohérent sur l'annulation (audit : un même
 * clic "Annuler" a été observé tantôt en "declined", tantôt en "pending" selon
 * l'appelant). On ne fait donc confiance qu'à "approved" pour un succès : tout
 * le reste (declined, canceled, pending, expired, statut inconnu, échec de
 * vérification) est traité comme un non-succès et ne redirige jamais vers
 * /confirmation avec un visuel de succès.
 */
export default async function RetourPaiement({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderId = searchParams.order;
  if (!orderId) redirect("/compte");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, statut, fedapay_transaction_id")
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
  // Par défaut (pas de transaction, statut inconnu, etc.) : non-succès.
  let destination = `/paiement/echec?order=${orderId}&raison=en_attente`;

  if (order.fedapay_transaction_id) {
    try {
      const trx = await recupererTransaction(Number(order.fedapay_transaction_id));
      console.info(`[fedapay retour] commande ${orderId} → statut reçu : ${trx.status}`);

      if (trx.status === "approved") {
        await finaliserCommande(orderId, trx.amount);
        destination = `/confirmation?order=${orderId}`;
      } else if (trx.status === "declined") {
        destination = `/paiement/echec?order=${orderId}&raison=refuse`;
      } else if (trx.status === "canceled") {
        destination = `/paiement/echec?order=${orderId}&raison=annule`;
      }
      // pending, expired, ou tout autre statut : non-succès (destination par
      // défaut ci-dessus). Le webhook reste la source de vérité et finalisera
      // la commande dès qu'il recevra "approved".
    } catch (e) {
      console.error("[fedapay] vérification au retour échouée :", e);
      // Vérification impossible = on ne peut pas confirmer le succès.
    }
  }

  redirect(destination);
}
