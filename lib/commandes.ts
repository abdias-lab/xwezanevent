import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Marque une commande « payée » et incrémente le quota vendu de chaque type de
 * billet. Idempotent : ne fait rien si la commande est déjà payée.
 * Utilisé au retour du checkout ET par le webhook FedaPay.
 */
export async function marquerCommandePayee(orderId: string): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, statut")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return false;
  if (order.statut === "paye") return true; // déjà finalisée

  await supabaseAdmin.from("orders").update({ statut: "paye" }).eq("id", orderId);

  const { data: tickets } = await supabaseAdmin
    .from("tickets")
    .select("ticket_type_id")
    .eq("order_id", orderId);

  const parType = new Map<string, number>();
  for (const t of (tickets ?? []) as { ticket_type_id: string }[]) {
    parType.set(t.ticket_type_id, (parType.get(t.ticket_type_id) ?? 0) + 1);
  }

  if (parType.size > 0) {
    const { data: types } = await supabaseAdmin
      .from("ticket_types")
      .select("id, quantite_vendue")
      .in("id", Array.from(parType.keys()));
    for (const tt of (types ?? []) as { id: string; quantite_vendue: number }[]) {
      await supabaseAdmin
        .from("ticket_types")
        .update({ quantite_vendue: tt.quantite_vendue + (parType.get(tt.id) ?? 0) })
        .eq("id", tt.id);
    }
  }
  return true;
}

/** Retrouve une commande par son id de transaction FedaPay. */
export async function commandeParTransaction(
  transactionId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("fedapay_transaction_id", transactionId)
    .maybeSingle();
  return data?.id ?? null;
}
