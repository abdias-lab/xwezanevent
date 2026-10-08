import { V2, echapperHtml, enveloppeV2, surTitreV2 } from "@/lib/emails/v2/gabarit";

/**
 * Page artiste retirée par l'équipe (décisions d'Abdias du 2026-10-08) :
 * e-mail au compte qui gère l'artiste, envoyé seulement si l'admin laisse la
 * case « prévenir » cochée. Sobre, au gabarit V2 ; le motif n'apparaît que
 * s'il a été saisi.
 */
export function emailArtisteRetire(d: { nom: string; motif: string | null }): { subject: string; html: string } {
  const p = (html: string, style = "") =>
    `<p style="margin:0 0 12px;font-family:${V2.police};font-size:15px;line-height:22px;color:${V2.gris};${style}">${html}</p>`;
  const contenu = `${surTitreV2("Page artiste")}
<h1 style="margin:0 0 12px;font-family:${V2.police};font-size:22px;line-height:28px;font-weight:800;color:${V2.texte};">La page de ${echapperHtml(d.nom)} n'est plus en ligne</h1>
${p(`L'équipe XwézanEvent a retiré la page de <strong style="color:${V2.texte};">${echapperHtml(d.nom)}</strong>. Elle n'est plus visible sur le site, et l'artiste n'apparaît plus sur les événements.`)}
${
  d.motif
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;border:1px solid ${V2.bordure};border-radius:4px;"><tr><td style="padding:16px;font-family:${V2.police};font-size:14px;line-height:21px;color:${V2.texte};"><strong>Motif :</strong> ${echapperHtml(d.motif)}</td></tr></table>`
    : ""
}
${p(`Pour en parler, écris-nous à <a href="mailto:contact@xwezan.com" style="color:${V2.texte};text-decoration:underline;">contact@xwezan.com</a>.`, "margin-bottom:0;")}`;
  return {
    subject: `${d.nom} : page artiste retirée`,
    html: enveloppeV2(contenu, { preheader: `La page de ${d.nom} n'est plus en ligne sur XwézanEvent.` }),
  };
}
