import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { recupererTransaction } from "@/lib/fedapay";
import { marquerCommandePayee, commandeParTransaction } from "@/lib/commandes";

/**
 * Webhook FedaPay — source de vérité asynchrone du paiement Mobile Money.
 * Nécessite FEDAPAY_WEBHOOK_SECRET (configuré dans le dashboard FedaPay) et une
 * URL publique (non joignable en localhost). Vérifie la signature HMAC puis
 * finalise la commande sur « transaction.approved ».
 */
export async function POST(req: NextRequest) {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  const payload = await req.text();
  const signature = req.headers.get("x-fedapay-signature");

  if (!secret) {
    console.warn("[fedapay webhook] FEDAPAY_WEBHOOK_SECRET non configuré — ignoré");
    return NextResponse.json({ received: true, ignored: true });
  }
  if (!signature) {
    return NextResponse.json({ error: "signature manquante" }, { status: 400 });
  }

  // Format « t=timestamp,s=hash »
  const parts = Object.fromEntries(
    signature.split(",").map((p) => p.split("=") as [string, string])
  );
  const attendu = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${payload}`)
    .digest("hex");

  const fournie = parts.s ?? "";
  const valide =
    fournie.length === attendu.length &&
    crypto.timingSafeEqual(Buffer.from(fournie), Buffer.from(attendu));
  if (!valide) {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  let event: {
    name?: string;
    entity?: { id?: number; status?: string };
  };
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "payload invalide" }, { status: 400 });
  }

  const trxId = event.entity?.id;
  const nom = event.name ?? "";
  if (trxId && (event.entity?.status === "approved" || nom.includes("approved"))) {
    // Re-vérifie l'état réel avant de créditer
    let confirme = false;
    try {
      const t = await recupererTransaction(Number(trxId));
      confirme = t.status === "approved";
    } catch (e) {
      console.error("[fedapay webhook] vérification échouée :", e);
    }
    if (confirme) {
      const orderId = await commandeParTransaction(String(trxId));
      if (orderId) await marquerCommandePayee(orderId);
    }
  }

  return NextResponse.json({ received: true });
}
