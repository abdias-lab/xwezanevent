import { boutonEmail, echapperHtml, enveloppeEmail } from "@/lib/emails/layout";

/** Boîte de l'équipe, qui reçoit les e-mails de surveillance. */
export const ADRESSE_EQUIPE = "contact@xwezan.com";

/**
 * Surveillance des comptes vérifiés (design/ARTISTES.md) : leurs artistes et
 * leurs événements sont publiés sans validation admin. L'équipe reçoit cet
 * e-mail à chaque publication, pour garder un œil, sans rien bloquer.
 */
export function emailPublicationVerifiee(d: { quoi: "artiste" | "evenement"; titre: string; auteur: string; lien: string }): { subject: string; html: string } {
  const libelle = d.quoi === "artiste" ? "une page artiste" : "un événement";
  const contenu = `
<h1 style="margin:0 0 12px;font-size:20px;color:#f3eada;">Publication d'un compte vérifié</h1>
<p style="margin:0;color:#b7a88f;font-size:14px;line-height:1.6;">
<strong style="color:#f3eada;">${echapperHtml(d.auteur)}</strong> (compte vérifié) vient de publier ${libelle}, en ligne sans validation :
« <strong style="color:#f3eada;">${echapperHtml(d.titre)}</strong> ».
</p>
${boutonEmail(d.quoi === "artiste" ? "Voir la page" : "Voir l'événement", d.lien)}
<p style="margin:16px 0 0;color:#b7a88f;font-size:12px;">Pour suspendre ses publications directes : Admin › Organisateurs › Retirer la vérification.</p>`;
  return {
    subject: `Publié sans validation — ${d.titre}`,
    html: enveloppeEmail(contenu, `${d.auteur} a publié ${libelle}`),
  };
}
