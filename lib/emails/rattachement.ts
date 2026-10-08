import { boutonEmail, echapperHtml, enveloppeEmail } from "@/lib/emails/layout";

/**
 * Rattachement proposé (design/ARTISTES.md, lot 2) : un organisateur met à
 * l'affiche de son événement un artiste qu'il ne gère pas. Le label ou le
 * compte de l'artiste reçoit cet e-mail, avec un lien direct vers la
 * proposition dans Mes artistes (Accepter / Refuser). Rien n'apparaît sur
 * l'événement ni sur la page de l'artiste avant l'accord.
 */
export function emailPropositionRattachement(d: {
  artiste: string;
  organisateur: string;
  evenement: string;
  quand: string;
  ou: string;
  lien: string;
}): { subject: string; html: string } {
  const fort = (t: string) => `<strong style="color:#f3eada;">${echapperHtml(t)}</strong>`;
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">${echapperHtml(d.artiste)} proposé à l'affiche</h1>
<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">
${fort(d.organisateur)} souhaite afficher ${fort(d.artiste)} sur son événement :
</p>
<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-top:16px;"><tr><td style="padding:16px;color:#f3eada;font-size:14px;line-height:1.6;">
<strong>${echapperHtml(d.evenement)}</strong><br>${echapperHtml(d.quand)} · ${echapperHtml(d.ou)}
</td></tr></table>
<p style="margin:16px 0 0;color:#b7a88f;font-size:14px;line-height:1.6;">
Tant que tu n&#39;as pas accepté, l&#39;artiste n&#39;apparaît ni sur l&#39;événement ni sur sa page. Si tu ne connais pas cet événement, refuse simplement.
</p>
${boutonEmail("Voir la proposition", d.lien)}`;
  return {
    subject: `${d.artiste} proposé à l'affiche de « ${d.evenement} »`,
    html: enveloppeEmail(contenu, `${d.organisateur} propose ${d.artiste} pour ${d.evenement}`),
  };
}
