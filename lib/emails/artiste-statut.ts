import { boutonEmail, echapperHtml, enveloppeEmail } from "@/lib/emails/layout";

/**
 * E-mails au demandeur d'une page artiste (design/ARTISTES.md) : création
 * validée ou refusée (avec motif), changement de nom accepté ou refusé.
 */

const paragraphe = (html: string) => `<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">${html}</p>`;
const encadre = (html: string) =>
  `<table role="presentation" width="100%" style="background:#151009;border:1px solid rgba(228,169,63,0.16);border-radius:14px;margin-top:16px;"><tr><td style="padding:16px;color:#f3eada;font-size:14px;line-height:1.6;">${html}</td></tr></table>`;
const titre = (t: string) => `<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">${t}</h1>`;
const nom = (n: string) => `<strong style="color:#f3eada;">${echapperHtml(n)}</strong>`;

export function emailArtisteValide(d: { nom: string; lienPage: string }): { subject: string; html: string } {
  const contenu = `${titre("La page artiste est en ligne")}
${paragraphe(`La page de ${nom(d.nom)} a été vérifiée et publiée sur XwézanEvent. Ses prochaines dates y apparaîtront, et ses fans pourront s&#39;y abonner.`)}
${boutonEmail("Voir la page", d.lienPage)}`;
  return { subject: `${d.nom} : la page artiste est en ligne`, html: enveloppeEmail(contenu, `La page de ${d.nom} est en ligne`) };
}

export function emailArtisteRefuse(d: { nom: string; motif: string | null; lienOrga: string }): { subject: string; html: string } {
  const contenu = `${titre("La page artiste n'a pas été validée")}
${paragraphe(`Nous n&#39;avons pas pu valider la page de ${nom(d.nom)}.`)}
${d.motif ? encadre(`<strong>Motif :</strong> ${echapperHtml(d.motif)}`) : ""}
${paragraphe(`<br>Tu peux corriger la demande et la renvoyer depuis ton espace, ou nous écrire à contact@xwezan.com.`)}
${boutonEmail("Mes artistes", d.lienOrga)}`;
  return { subject: `${d.nom} : la page artiste n'a pas été validée`, html: enveloppeEmail(contenu, `La page de ${d.nom} n'a pas été validée`) };
}

export function emailNomAccepte(d: { ancien: string; nouveau: string; lienPage: string }): { subject: string; html: string } {
  const contenu = `${titre("Nouveau nom de scène validé")}
${paragraphe(`${nom(d.ancien)} s&#39;affiche désormais sous le nom ${nom(d.nouveau)}. L&#39;adresse de la page ne change pas.`)}
${boutonEmail("Voir la page", d.lienPage)}`;
  return { subject: `Nouveau nom validé : ${d.nouveau}`, html: enveloppeEmail(contenu, `${d.ancien} devient ${d.nouveau}`) };
}

export function emailNomRefuse(d: { ancien: string; nouveau: string; motif: string | null; lienOrga: string }): { subject: string; html: string } {
  const contenu = `${titre("Changement de nom non validé")}
${paragraphe(`Le nouveau nom ${nom(d.nouveau)} n&#39;a pas été validé : la page reste affichée sous le nom ${nom(d.ancien)}.`)}
${d.motif ? encadre(`<strong>Motif :</strong> ${echapperHtml(d.motif)}`) : ""}
${boutonEmail("Mes artistes", d.lienOrga)}`;
  return { subject: `Changement de nom non validé : ${d.ancien}`, html: enveloppeEmail(contenu, `Le nom ${d.nouveau} n'a pas été validé`) };
}
