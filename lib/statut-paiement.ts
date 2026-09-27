/**
 * Lecture des statuts de transaction FedaPay, partagée par le retour
 * navigateur (/paiement/retour) et la relance (/api/orders/[id]/reessayer).
 *
 * - payée : le SDK FedaPay (Transaction.PAID_STATUS) compte aussi
 *   « transferred » (approuvée puis versée au marchand), pas seulement
 *   « approved » ;
 * - échec définitif : la transaction ne pourra plus jamais aboutir, une
 *   nouvelle peut être créée sans risque de double débit ;
 * - tout le reste (« pending », statut inconnu, remboursée…) : en cours ou
 *   incertain. On ne relance jamais dans ce cas (design/BUGS_REFONTE.md #12).
 */
const PAYEE = new Set(["approved", "transferred"]);
const ECHEC_DEFINITIF = new Set(["declined", "canceled", "expired"]);

export type IssueTransaction = "payee" | "echec_definitif" | "en_cours";

export function issueTransaction(statut: string): IssueTransaction {
  if (PAYEE.has(statut)) return "payee";
  if (ECHEC_DEFINITIF.has(statut)) return "echec_definitif";
  return "en_cours";
}
