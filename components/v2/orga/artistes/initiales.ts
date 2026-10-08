/** Initiales d'un nom de scène (2 au plus), repli sans photo. Module neutre : serveur et client. */
export function initialesArtiste(nom: string) {
  return nom
    .split(/\s+/)
    .filter((m) => /[A-Za-zÀ-ÿ0-9]/.test(m[0] ?? ""))
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("");
}
