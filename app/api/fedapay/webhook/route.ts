import { NextResponse, type NextRequest } from "next/server";
import { construireEvenementWebhook } from "@/lib/fedapay";
import { finaliserCommande, commandeParTransaction } from "@/lib/commandes";

/**
 * Webhook FedaPay — source de vérité du paiement Mobile Money.
 * Requiert FEDAPAY_WEBHOOK_SECRET + une URL publique. Vérifie la signature HMAC
 * puis, sur « transaction.approved », finalise la commande (idempotent) si le
 * montant FedaPay correspond au total en base.
 */
export async function POST(req: NextRequest) {
  if (!process.env.FEDAPAY_WEBHOOK_SECRET) {
    console.warn("[fedapay webhook] secret non configuré — ignoré");
    return NextResponse.json({ received: true, ignored: true });
  }

  const payload = await req.text();
  const signature = req.headers.get("x-fedapay-signature") ?? "";

  let event;
  try {
    event = construireEvenementWebhook(payload, signature);
  } catch (e) {
    console.error("[fedapay webhook] signature invalide :", (e as Error).message);
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  const estApprouve =
    event.name === "transaction.approved" || event.entity?.status === "approved";
  const trxId = event.entity?.id;
  const montant = event.entity?.amount;

  if (estApprouve && trxId != null && typeof montant === "number") {
    const commande = await commandeParTransaction(String(trxId));
    if (commande) {
      const r = await finaliserCommande(commande.id, montant);
      if (r === "montant") {
        console.warn(
          `[fedapay webhook] montant incohérent pour la commande ${commande.id}`
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
