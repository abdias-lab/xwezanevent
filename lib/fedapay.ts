/**
 * Intégration FedaPay via le SDK officiel (Mobile Money Bénin — MTN / Moov / Celtiis + carte).
 * ⚠️ SERVEUR UNIQUEMENT : utilise la clé secrète. Ne jamais importer côté client.
 */
import { FedaPay, Transaction, Webhook } from "fedapay";

function init() {
  const sk = process.env.FEDAPAY_SECRET_KEY;
  if (!sk) throw new Error("FEDAPAY_SECRET_KEY manquante");
  FedaPay.setApiKey(sk);
  FedaPay.setEnvironment(
    process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox"
  );
}

interface Client {
  firstname?: string;
  lastname?: string;
  email?: string;
}

/**
 * Crée une transaction (montant en FCFA / XOF) et génère le lien de paiement
 * hébergé. Retourne l'id FedaPay et l'URL du checkout.
 */
export async function creerTransactionEtLien(params: {
  description: string;
  montant: number;
  callbackUrl: string;
  client?: Client;
}): Promise<{ id: number; url: string }> {
  init();
  const transaction = await Transaction.create({
    description: params.description,
    amount: params.montant,
    currency: { iso: "XOF" },
    callback_url: params.callbackUrl,
    ...(params.client ? { customer: params.client } : {}),
  });
  const token = await transaction.generateToken();
  return { id: Number(transaction.id), url: String(token.url) };
}

/** État courant d'une transaction (pour vérifier au retour navigateur). */
export async function recupererTransaction(
  id: number
): Promise<{ id: number; status: string; amount: number }> {
  init();
  const t = await Transaction.retrieve(id);
  return { id: Number(t.id), status: String(t.status), amount: Number(t.amount) };
}

export interface EvenementWebhook {
  name: string;
  entity: { id?: number; status?: string; amount?: number };
}

/**
 * Vérifie la signature HMAC d'un webhook FedaPay et retourne l'événement.
 * Lève une erreur si la signature est invalide ou expirée (tolérance 5 min).
 */
export function construireEvenementWebhook(
  payload: string,
  signatureHeader: string
): EvenementWebhook {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("FEDAPAY_WEBHOOK_SECRET manquante");
  // Webhook.constructEvent vérifie la signature puis renvoie l'événement.
  return Webhook.constructEvent(payload, signatureHeader, secret) as unknown as EvenementWebhook;
}
