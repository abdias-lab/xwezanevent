/**
 * Emails HTML : styles inline uniquement (les clients mail ignorent en
 * grande partie <style>/CSS externe), couleurs codées en dur reprenant
 * la palette Doré de app/globals.css (--fond, --surface, --accent...).
 */

export function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function enveloppeEmail(contenu: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#151009;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapperHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#151009;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#1f1710;border:1px solid rgba(228,169,63,0.16);border-radius:20px;overflow:hidden;">
<tr><td style="padding:26px 32px;border-bottom:1px solid rgba(228,169,63,0.16);">
<span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:700;font-size:21px;color:#e4a93f;">Xwézan</span><span style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-weight:600;font-size:15px;letter-spacing:0.02em;color:#f3eada;margin-left:5px;">Event</span>
</td></tr>
<tr><td style="padding:32px;color:#f3eada;">
${contenu}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid rgba(228,169,63,0.16);color:#b7a88f;font-size:12px;line-height:1.6;">
XwézanEvent — La billetterie du Bénin<br />Mì wá djawá ! · La fête vous attend.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function boutonEmail(texte: string, href: string, style: "plein" | "contour" = "plein"): string {
  const fond = style === "plein" ? "background:#e4a93f;color:#151009;" : "background:none;border:1px solid #e4a93f;color:#e4a93f;";
  return `<a href="${href}" style="display:block;text-align:center;${fond}font-weight:700;font-size:15px;padding:14px;border-radius:100px;text-decoration:none;margin-top:20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${echapperHtml(texte)}</a>`;
}
