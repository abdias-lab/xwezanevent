import { enveloppeEmail, boutonEmail, echapperHtml } from "@/lib/emails/layout";

export function emailEvenementValide(d: { titre: string; lienEvenement: string }): {
  subject: string;
  html: string;
} {
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">Ton événement est en ligne ✅</h1>
<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">
« <strong style="color:#f3eada;">${echapperHtml(d.titre)}</strong> » a été validé par notre équipe et est maintenant visible dans le catalogue public. Les ventes de billets sont ouvertes.
</p>
${boutonEmail("Voir mon événement", d.lienEvenement)}`;

  return {
    subject: `« ${d.titre} » est en ligne`,
    html: enveloppeEmail(contenu, `${d.titre} est validé et publié`),
  };
}

export function emailEvenementRefuse(d: {
  titre: string;
  motif: string | null;
  lienOrga: string;
}): { subject: string; html: string } {
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">Événement non validé</h1>
<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">
« <strong style="color:#f3eada;">${echapperHtml(d.titre)}</strong> » n&#39;a pas été validé pour publication par notre équipe.
</p>
${
  d.motif
    ? `<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-top:16px;"><tr><td style="padding:16px;color:#f3eada;font-size:14px;line-height:1.6;"><strong>Motif :</strong> ${echapperHtml(d.motif)}</td></tr></table>`
    : ""
}
${boutonEmail("Voir mon espace organisateur", d.lienOrga, "contour")}`;

  return {
    subject: `« ${d.titre} » n'a pas été validé`,
    html: enveloppeEmail(contenu, `${d.titre} n'a pas été validé`),
  };
}
