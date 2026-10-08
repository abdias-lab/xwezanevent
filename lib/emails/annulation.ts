import { V2, boutonV2, echapperHtml, enveloppeV2, surTitreV2 } from "@/lib/emails/v2/gabarit";

/**
 * E-mail d'annulation aux acheteurs (design/BUGS_REFONTE.md n°7), au gabarit
 * V2. Une commande payée = un e-mail. Reprend les engagements de la page
 * /remboursements : le prix des billets (orders.total) remboursé en entier,
 * sans retenue de XwézanEvent, sur le numéro Mobile Money de l'achat, sous
 * 14 jours ; les frais de l'opérateur de paiement ne sont pas remboursables
 * (décision d'Abdias du 2026-10-08) ; fonds gelés dès l'annulation.
 */

export const DELAI_REMBOURSEMENT_JOURS = 14;

const montant = (n: number) => n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
const p = (html: string, style = "") =>
  `<p style="margin:0 0 12px;font-family:${V2.police};font-size:15px;line-height:22px;color:${V2.gris};${style}">${html}</p>`;
const fort = (t: string) => `<strong style="color:${V2.texte};">${echapperHtml(t)}</strong>`;

export function emailAnnulation(d: {
  titre: string;
  quand: string;
  ou: string;
  total: number;
  billets: number;
  reference: string;
  /** Acheteur avec compte : lien vers /compte ; invité : page /remboursements. */
  lien: string;
  avecCompte: boolean;
}): { subject: string; html: string } {
  const contenu = `${surTitreV2("Événement annulé")}
<h1 style="margin:0 0 8px;font-family:${V2.police};font-size:24px;line-height:30px;font-weight:800;color:${V2.texte};">${echapperHtml(d.titre)} est annulé</h1>
${p(`${echapperHtml(d.quand)} · ${echapperHtml(d.ou)}`, "margin-bottom:20px;")}
${p(`${d.billets > 1 ? "Tes billets ne sont plus valables" : "Ton billet n'est plus valable"} : inutile de te présenter à l'entrée.`, `color:${V2.texte};font-weight:600;`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;border:1px solid ${V2.bordure};border-radius:4px;"><tr><td style="padding:16px;">
<p style="margin:0 0 4px;font-family:${V2.police};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${V2.or};">Remboursement</p>
<p style="margin:0 0 6px;font-family:${V2.police};font-size:20px;line-height:26px;font-weight:800;color:${V2.texte};">${montant(d.total)}</p>
<p style="margin:0;font-family:${V2.police};font-size:14px;line-height:21px;color:${V2.gris};">${d.billets > 1 ? "Le prix de tes billets est remboursé" : "Le prix de ton billet est remboursé"} en entier, sans retenue de XwézanEvent, sur le numéro Mobile Money utilisé pour l'achat, ${fort(`sous ${DELAI_REMBOURSEMENT_JOURS} jours`)} au plus tard. Les frais de l'opérateur de paiement, prélevés lors de l'achat, ne sont pas remboursables. Tu n'as rien à faire.</p>
</td></tr></table>
${p("Les fonds de cet événement sont gelés depuis l'annulation : ton remboursement ne dépend pas de l'organisateur.")}
${p(`Référence de ta commande : ${fort(d.reference)}`)}
${boutonV2(d.avecCompte ? "Suivre mon remboursement" : "Comment se passe le remboursement", d.lien)}`;

  const pied = `Une question sur ton remboursement ? Écris à <a href="mailto:contact@xwezan.com" style="color:${V2.gris};text-decoration:underline;">contact@xwezan.com</a> en indiquant ta référence.`;
  return {
    subject: `Annulé : ${d.titre}, remboursement sous ${DELAI_REMBOURSEMENT_JOURS} jours`,
    html: enveloppeV2(contenu, { preheader: `${d.titre} est annulé. Remboursement de ${montant(d.total)} sous ${DELAI_REMBOURSEMENT_JOURS} jours.`, pied }),
  };
}
