/**
 * Garde anti-redirection ouverte : ne renvoie `chemin` que s'il désigne une
 * page interne du site, sinon `repli`.
 *
 * Un chemin interne commence par un seul « / », sans antislash ni caractère
 * de contrôle. Tester seulement `startsWith("/")` ne suffit pas :
 * - « //site.com » et « /\site.com » sont des URL absolues pour le navigateur ;
 * - les navigateurs suppriment tabulations et retours à la ligne d'une URL,
 *   donc « /<tab>/site.com » devient « //site.com ».
 * Voir design/BUGS_REFONTE.md, bug #8.
 */
const CHEMIN_INTERNE = /^\/(?!\/)[^\\\u0000-\u001F\u007F]*$/;

export function cheminInterne(chemin: string | null | undefined, repli = "/"): string {
  return typeof chemin === "string" && CHEMIN_INTERNE.test(chemin) ? chemin : repli;
}
