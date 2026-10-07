import { echapperHtml } from "@/lib/emails/layout";

/**
 * Gabarit des e-mails au design V2 (refonte « Doré + nuit ») : fond
 * anthracite, carte légèrement relevée, accent doré, bouton d'action blanc.
 * Couleurs reprises de components/v2/v2.module.css (--bg, --raised,
 * --border, --muted, --or), codées en dur et en styles inline : les
 * messageries ignorent les feuilles de style et les variables CSS.
 * Premier e-mail sur ce gabarit : « nouvelle date » (lot 3). Les e-mails
 * existants restent sur lib/emails/layout.ts en attendant leur refonte.
 */

export const V2 = {
  fond: "#1c1c1c",
  carte: "#242424",
  bordure: "rgba(255,255,255,0.1)",
  texte: "#ffffff",
  gris: "#a3a5a8",
  or: "#e4a93f",
  inverse: "#1c1c1c",
  police: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

export { echapperHtml };

/** Bouton d'action principal : blanc plein, texte anthracite en capitales (comme .btnBlanc du site). */
export function boutonV2(texte: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;"><tr><td align="center" bgcolor="#ffffff" style="border-radius:4px;">
<a href="${echapperHtml(href)}" style="display:block;padding:15px 20px;font-family:${V2.police};font-size:13px;line-height:18px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${V2.inverse};text-decoration:none;border-radius:4px;">${echapperHtml(texte)}</a>
</td></tr></table>`;
}

/** Sur-titre doré en capitales (« NOUVELLE DATE »). */
export const surTitreV2 = (texte: string) =>
  `<p style="margin:0 0 8px;font-family:${V2.police};font-size:12px;line-height:16px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${V2.or};">${echapperHtml(texte)}</p>`;

/**
 * Enveloppe V2 : logo typographique (« Xwézan » italique doré + « Event »),
 * carte de contenu, pied avec `pied` (HTML déjà échappé par l'appelant :
 * raison de l'envoi, liens de désabonnement) puis le slogan.
 */
export function enveloppeV2(contenu: string, opts: { preheader?: string; pied?: string } = {}): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
</head>
<body style="margin:0;padding:0;background:${V2.fond};font-family:${V2.police};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapperHtml(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${V2.fond}" style="background:${V2.fond};padding:24px 12px 32px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:4px 4px 20px;">
<span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:22px;color:${V2.or};">Xwézan</span><span style="font-family:${V2.police};font-weight:600;font-size:15px;letter-spacing:0.02em;color:#f3eada;margin-left:4px;">Event</span>
</td></tr>
<tr><td bgcolor="${V2.carte}" style="background:${V2.carte};border:1px solid ${V2.bordure};border-radius:4px;padding:28px 24px;color:${V2.texte};">
${contenu}
</td></tr>
<tr><td style="padding:20px 4px 0;font-family:${V2.police};font-size:12px;line-height:18px;color:${V2.gris};">
${opts.pied ? `${opts.pied}<br /><br />` : ""}XwézanEvent · Mì wá djawá !
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
