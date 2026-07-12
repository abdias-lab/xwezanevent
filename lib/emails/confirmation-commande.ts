import { enveloppeEmail, boutonEmail, echapperHtml } from "@/lib/emails/layout";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

export interface BilletEmail {
  nom: string;
  /** data:image/png;base64,... */
  qrDataUrl: string;
}

export interface ConfirmationCommandeData {
  numeroCommande: string;
  titreEvenement: string;
  dateHeureEvenement: string;
  lieu: string;
  ville: string;
  billets: BilletEmail[];
  /** Prix exact des billets — aucun frais de service XwézanEvent ajouté (voir /tarifs). */
  total: number;
  lienBillets: string;
}

export function emailConfirmationCommande(d: ConfirmationCommandeData): {
  subject: string;
  html: string;
} {
  const billetsHtml = d.billets
    .map(
      (b) => `
<table role="presentation" width="100%" style="margin-bottom:12px;background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;">
<tr>
<td style="padding:16px;vertical-align:middle;">
<div style="font-weight:600;color:#f3eada;font-size:14px;">${echapperHtml(b.nom)}</div>
</td>
<td style="padding:12px;text-align:right;width:100px;">
<img src="${b.qrDataUrl}" width="84" height="84" alt="QR code du billet" style="display:block;margin-left:auto;border-radius:8px;" />
</td>
</tr>
</table>`
    )
    .join("");

  const contenu = `
<h1 style="margin:0 0 6px;font-size:20px;color:#f3eada;">Paiement confirmé 🎉</h1>
<p style="margin:0 0 24px;color:#b7a88f;font-size:13px;">Commande ${echapperHtml(d.numeroCommande)}</p>

<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-bottom:24px;">
<tr><td style="padding:18px;">
<div style="font-weight:700;font-size:16px;color:#f3eada;margin-bottom:6px;">${echapperHtml(d.titreEvenement)}</div>
<div style="color:#b7a88f;font-size:13px;">📅 ${echapperHtml(d.dateHeureEvenement)}</div>
<div style="color:#b7a88f;font-size:13px;">📍 ${echapperHtml(d.lieu)}, ${echapperHtml(d.ville)}</div>
</td></tr>
</table>

<p style="margin:0 0 12px;font-weight:600;color:#f3eada;font-size:14px;">Tes billets</p>
${billetsHtml}

<table role="presentation" width="100%" style="margin:20px 0 0;font-size:13px;color:#b7a88f;">
<tr><td style="font-weight:700;color:#f3eada;font-size:14px;">Total payé</td><td align="right" style="font-weight:700;color:#e4a93f;font-size:14px;">${fmt(d.total)}</td></tr>
</table>

${boutonEmail("Voir mes billets", d.lienBillets)}

<p style="margin-top:20px;color:#b7a88f;font-size:12px;line-height:1.6;">Présente le QR code à l&#39;entrée de l&#39;événement. Tu peux aussi le retrouver à tout moment dans « Mes billets ».</p>`;

  return {
    subject: `Paiement confirmé — ${d.titreEvenement}`,
    html: enveloppeEmail(contenu, `Tes billets pour ${d.titreEvenement} sont prêts`),
  };
}
