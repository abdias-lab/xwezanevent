import { enveloppeEmail, boutonEmail, echapperHtml } from "@/lib/emails/layout";
import type { BilletEmail } from "@/lib/emails/confirmation-commande";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

export interface CommandeRecap {
  numeroCommande: string;
  titreEvenement: string;
  dateHeureEvenement: string;
  lieu: string;
  ville: string;
  billets: BilletEmail[];
  total: number;
}

export interface RecapitulatifBilletsData {
  commandes: CommandeRecap[];
  lienBillets: string;
}

/**
 * Récapitulatif "Retrouver mon billet" : UN SEUL email listant TOUTES les
 * commandes payées trouvées pour l'adresse recherchée (compte ou invité),
 * plutôt qu'un email par commande. Distinct du template "Paiement confirmé"
 * (confirmation-commande.ts) — celui-ci reste envoyé tel quel juste après
 * un paiement (un seul achat, un seul total, ton "reçu").
 */
export function emailRecapitulatifBillets(d: RecapitulatifBilletsData): {
  subject: string;
  html: string;
} {
  const nbBillets = d.commandes.reduce((n, c) => n + c.billets.length, 0);

  const commandesHtml = d.commandes
    .map((c) => {
      const billetsHtml = c.billets
        .map(
          (b) => `
<table role="presentation" width="100%" style="margin-bottom:10px;background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;">
<tr>
<td style="padding:14px 16px;vertical-align:middle;">
<div style="font-weight:600;color:#f3eada;font-size:14px;">${echapperHtml(b.nom)}</div>
</td>
<td style="padding:10px;text-align:right;width:84px;">
<img src="cid:${b.qrCid}" width="72" height="72" alt="QR code du billet" style="display:block;margin-left:auto;border-radius:8px;" />
</td>
</tr>
</table>`
        )
        .join("");

      return `
<table role="presentation" width="100%" style="background:#2a1f14;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-bottom:10px;">
<tr><td style="padding:16px 18px;">
<div style="font-weight:700;font-size:15px;color:#f3eada;margin-bottom:5px;">${echapperHtml(c.titreEvenement)}</div>
<div style="color:#b7a88f;font-size:13px;">📅 ${echapperHtml(c.dateHeureEvenement)}</div>
<div style="color:#b7a88f;font-size:13px;">📍 ${echapperHtml(c.lieu)}, ${echapperHtml(c.ville)}</div>
</td></tr>
</table>
${billetsHtml}
<table role="presentation" width="100%" style="margin:0 0 26px;font-size:12px;color:#8a7b64;">
<tr><td>Commande ${echapperHtml(c.numeroCommande)}</td><td align="right">${fmt(c.total)}</td></tr>
</table>`;
    })
    .join("");

  const contenu = `
<h1 style="margin:0 0 6px;font-size:20px;color:#f3eada;">Tes billets 🎟️</h1>
<p style="margin:0 0 24px;color:#b7a88f;font-size:13px;">${d.commandes.length} commande${d.commandes.length > 1 ? "s" : ""} · ${nbBillets} billet${nbBillets > 1 ? "s" : ""}</p>

${commandesHtml}

${boutonEmail("Voir mes billets", d.lienBillets)}

<p style="margin-top:20px;color:#b7a88f;font-size:12px;line-height:1.6;">Présente le QR code correspondant à l&#39;entrée de chaque événement.</p>`;

  return {
    subject: `Tes billets XwézanEvent (${nbBillets} billet${nbBillets > 1 ? "s" : ""})`,
    html: enveloppeEmail(contenu, `Récapitulatif de tes ${nbBillets} billet${nbBillets > 1 ? "s" : ""} XwézanEvent`),
  };
}
