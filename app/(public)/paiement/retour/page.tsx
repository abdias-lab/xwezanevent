import { supabaseAdmin } from "@/lib/supabase-admin";
import { recupererTransaction } from "@/lib/fedapay";
import { marquerCommandePayee } from "@/lib/commandes";
import { redirect } from "next/navigation";

/**
 * Retour depuis le checkout FedaPay : vérifie l'état de la transaction et,
 * si le paiement est approuvé, marque la commande « payée » + incrémente le
 * quota vendu (idempotent), puis redirige vers la confirmation.
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

  // Déjà finalisée ou pas de transaction : on affiche la confirmation telle quelle
  if (order.statut === "paye" || !order.fedapay_transaction_id) {
    redirect(`/confirmation?order=${orderId}`);
  }

  let approuve = false;
  try {
    const trx = await recupererTransaction(Number(order.fedapay_transaction_id));
    approuve = trx.status === "approved";
  } catch (e) {
    console.error("[fedapay] vérification transaction échouée :", e);
  }

  if (approuve) {
    await marquerCommandePayee(orderId);
  }

  redirect(`/confirmation?order=${orderId}`);
}
