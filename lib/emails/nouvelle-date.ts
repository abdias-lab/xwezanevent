import { V2, boutonV2, echapperHtml, enveloppeV2, surTitreV2 } from "@/lib/emails/v2/gabarit";

/**
 * E-mail « nouvelle date » aux abonnés d'un artiste (design/ARTISTES.md,
 * lot 3), au gabarit V2. Un seul e-mail par abonné et par événement : s'il
 * suit plusieurs artistes de l'affiche, ils sont tous cités, avec un lien
 * de désabonnement par artiste en pied.
 */

/** « A », « A et B », « A, B et C ». */
export function listeNoms(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? "";
  return `${noms.slice(0, -1).join(", ")} et ${noms[noms.length - 1]}`;
}

export function emailNouvelleDate(d: {
  artistes: string[];
  titre: string;
  quand: string;
  quandCourt: string;
  ou: string;
  image: string | null;
  lien: string;
  desabonnements: { artiste: string; lien: string }[];
}): { subject: string; html: string } {
  const qui = listeNoms(d.artistes);
  const pluriel = d.artistes.length > 1;
  const contenu = `${surTitreV2("Nouvelle date")}
<h1 style="margin:0 0 12px;font-family:${V2.police};font-size:24px;line-height:30px;font-weight:800;color:${V2.texte};">${echapperHtml(qui)} ${pluriel ? "seront" : "sera"} sur scène</h1>
<p style="margin:16px 0 4px;font-family:${V2.police};font-size:18px;line-height:24px;font-weight:700;color:${V2.texte};">${echapperHtml(d.titre)}</p>
<p style="margin:0;font-family:${V2.police};font-size:15px;line-height:22px;color:${V2.or};font-weight:600;">${echapperHtml(d.quand)}</p>
<p style="margin:2px 0 0;font-family:${V2.police};font-size:15px;line-height:22px;color:${V2.gris};">${echapperHtml(d.ou)}</p>
${boutonV2("Voir l'événement", d.lien)}
${/* Affiche après l'essentiel : une affiche verticale repousserait date et bouton sous le pli sur téléphone. */ ""}
${d.image ? `<a href="${echapperHtml(d.lien)}"><img src="${echapperHtml(d.image)}" alt="Affiche : ${echapperHtml(d.titre)}" width="510" style="display:block;width:100%;max-width:510px;height:auto;border:0;border-radius:4px;margin-top:20px;" /></a>` : ""}`;

  const liens = d.desabonnements
    .map((x) => `<a href="${echapperHtml(x.lien)}" style="color:${V2.gris};text-decoration:underline;">Ne plus suivre ${echapperHtml(x.artiste)}</a>`)
    .join(" · ");
  const pied = `Tu reçois cet e-mail parce que tu suis ${echapperHtml(qui)} sur XwézanEvent.<br />${liens}`;

  return {
    subject: `${qui} : nouvelle date le ${d.quandCourt}`,
    html: enveloppeV2(contenu, { preheader: `${d.titre} · ${d.quand} · ${d.ou}`, pied }),
  };
}
