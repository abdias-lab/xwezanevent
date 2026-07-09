import { supabaseAdmin } from "@/lib/supabase-admin";
import { recupererTransaction } from "@/lib/fedapay";
import { finaliserCommande } from "@/lib/commandes";
import { redirect } from "next/navigation";

/**
 * Retour navigateur depuis le checkout FedaPay. Comme il n'y a pas de signature
 * ici, on vérifie l'état RÉEL de la transaction via l'API avant de finaliser
 * (le webhook reste la source de vérité ; finaliserCommande est idempotent).
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

  if (order.statut !== "paye" && order.fedapay_transaction_id) {
    try {
      const trx = await recupererTransaction(Number(order.fedapay_transaction_id));
      if (trx.status === "approved") {
        await finaliserCommande(orderId, trx.amount);
      }
    } catch (e) {
      console.error("[fedapay] vérification au retour échouée :", e);
    }
  }

  redirect(`/confirmation?order=${orderId}`);
}
