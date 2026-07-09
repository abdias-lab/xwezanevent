import { supabaseAdmin } from "@/lib/supabase-admin";

interface PanierItem {
  ticket_type_id: string;
  quantite: number;
}

export type ResultatFinalisation =
  | "ok" // paiement validé, billets générés
  | "deja" // déjà finalisée (idempotent)
  | "montant" // le montant payé ne correspond pas au total
  | "introuvable";

/**
 * Finalise une commande payée, de façon IDEMPOTENTE :
 *  - refuse si le montant payé ≠ total en base ;
 *  - passe la commande en « paye » via un claim atomique (en_attente → paye) :
 *    un second appel (webhook rejoué) ne recrée pas les billets ;
 *  - génère les billets (code QR auto) depuis le panier ;
 *  - décrémente le stock (quantite_vendue += quantité).
 */
export async function finaliserCommande(
  orderId: string,
  montantPaye: number
): Promise<ResultatFinalisation> {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, statut, total, panier")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return "introuvable";
  if (order.statut === "paye") return "deja";
  if (montantPaye !== order.total) return "montant";

  // Claim atomique : seul l'appel qui réussit cette transition crée les billets.
  const { data: claim } = await supabaseAdmin
    .from("orders")
    .update({ statut: "paye" })
    .eq("id", orderId)
    .eq("statut", "en_attente")
    .select("id");
  if (!claim || claim.length === 0) return "deja";

  const panier = (order.panier ?? []) as PanierItem[];

  // Génère un billet par unité
  const billets = panier.flatMap((p) =>
    Array.from({ length: p.quantite }, () => ({
      order_id: orderId,
      ticket_type_id: p.ticket_type_id,
    }))
  );
  if (billets.length > 0) {
    await supabaseAdmin.from("tickets").insert(billets);
  }

  // Décrémente le stock (incrémente quantite_vendue)
  const ids = panier.map((p) => p.ticket_type_id);
  if (ids.length > 0) {
    const { data: types } = await supabaseAdmin
      .from("ticket_types")
      .select("id, quantite_vendue")
      .in("id", ids);
    const venduParId = new Map(
      ((types ?? []) as { id: string; quantite_vendue: number }[]).map((t) => [
        t.id,
        t.quantite_vendue,
      ])
    );
    for (const p of panier) {
      await supabaseAdmin
        .from("ticket_types")
        .update({ quantite_vendue: (venduParId.get(p.ticket_type_id) ?? 0) + p.quantite })
        .eq("id", p.ticket_type_id);
    }
  }

  return "ok";
}

/** Retrouve une commande par son id de transaction FedaPay. */
export async function commandeParTransaction(
  transactionId: string
): Promise<{ id: string } | null> {
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("fedapay_transaction_id", transactionId)
    .maybeSingle();
  return data ?? null;
}
