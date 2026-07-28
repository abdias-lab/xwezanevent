import { enveloppeEmail, boutonEmail, echapperHtml } from "@/lib/emails/layout";

/**
 * Notifie un acheteur (billet déjà payé) que la DATE de l'événement a
 * changé — le seul changement d'édition organisateur qui déclenche un
 * email automatique (un changement d'heure seule ne notifie pas).
 */
export function emailEvenementDateModifiee(d: {
  titre: string;
  dateAffichee: string;
  lienEvenement: string;
}): { subject: string; html: string } {
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">La date de l'événement a changé</h1>
<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">
L&#39;organisateur de « <strong style="color:#f3eada;">${echapperHtml(d.titre)}</strong> », pour lequel tu as un billet, a modifié la date de l&#39;événement.
</p>
<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-top:16px;"><tr><td style="padding:16px;color:#f3eada;font-size:14px;line-height:1.6;"><strong>Nouvelle date :</strong> ${echapperHtml(d.dateAffichee)}</td></tr></table>
${boutonEmail("Voir l'événement", d.lienEvenement)}`;

  return {
    subject: `Changement de date — « ${d.titre} »`,
    html: enveloppeEmail(contenu, `La date de ${d.titre} a changé`),
  };
}
