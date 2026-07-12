import { enveloppeEmail, echapperHtml } from "@/lib/emails/layout";

export interface ContactData {
  nom: string;
  email: string;
  message: string;
}

export function emailContact(d: ContactData): { subject: string; html: string } {
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">Nouveau message — Contact</h1>
<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-bottom:20px;">
<tr><td style="padding:18px;">
<div style="color:#b7a88f;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">De</div>
<div style="color:#f3eada;font-size:14px;margin-bottom:12px;">${echapperHtml(d.nom)} — ${echapperHtml(d.email)}</div>
<div style="color:#b7a88f;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Message</div>
<div style="color:#f3eada;font-size:14px;white-space:pre-wrap;">${echapperHtml(d.message)}</div>
</td></tr>
</table>
<p style="margin:0;color:#b7a88f;font-size:12px;">Répondre directement à ${echapperHtml(d.email)}.</p>`;

  return {
    subject: `Contact XwézanEvent — ${d.nom}`,
    html: enveloppeEmail(contenu),
  };
}
