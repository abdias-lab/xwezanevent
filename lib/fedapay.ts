/**
 * Client FedaPay minimal (Mobile Money Bénin — MTN / Moov + carte).
 * ⚠️ SERVEUR UNIQUEMENT : utilise la clé secrète. Ne jamais importer côté client.
 *
 * Docs : https://docs.fedapay.com
 */

const ENV = process.env.FEDAPAY_ENVIRONMENT ?? "sandbox";
const BASE =
  ENV === "live" || ENV === "production"
    ? "https://api.fedapay.com/v1"
    : "https://sandbox-api.fedapay.com/v1";

function cle(): string {
  const sk = process.env.FEDAPAY_SECRET_KEY;
  if (!sk) throw new Error("FEDAPAY_SECRET_KEY manquante");
  return sk;
}

async function requete<T = unknown>(
  chemin: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${chemin}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cle()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const corps = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `FedaPay ${chemin} → ${res.status} ${JSON.stringify(corps).slice(0, 200)}`
    );
  }
  return corps as T;
}

export interface FedaTransaction {
  id: number;
  status: string; // pending | approved | declined | canceled | ...
  amount: number;
  reference: string;
}

interface Client {
  firstname?: string;
  lastname?: string;
  email?: string;
}

/** Crée une transaction FedaPay (montant en FCFA / XOF). */
export async function creerTransaction(params: {
  description: string;
  montant: number;
  callbackUrl: string;
  client?: Client;
}): Promise<FedaTransaction> {
  const r = await requete<{ "v1/transaction": FedaTransaction }>(
    "/transactions",
    {
      method: "POST",
      body: JSON.stringify({
        description: params.description,
        amount: params.montant,
        currency: { iso: "XOF" },
        callback_url: params.callbackUrl,
        ...(params.client ? { customer: params.client } : {}),
      }),
    }
  );
  return r["v1/transaction"];
}

/** Génère le lien de paiement hébergé (checkout Mobile Money / carte). */
export async function genererLienPaiement(transactionId: number): Promise<string> {
  const r = await requete<{ url: string }>(
    `/transactions/${transactionId}/token`,
    { method: "POST" }
  );
  return r.url;
}

/** Récupère l'état courant d'une transaction (pour vérifier au retour). */
export async function recupererTransaction(
  transactionId: number
): Promise<FedaTransaction> {
  const r = await requete<{ "v1/transaction": FedaTransaction }>(
    `/transactions/${transactionId}`,
    { method: "GET" }
  );
  return r["v1/transaction"];
}
