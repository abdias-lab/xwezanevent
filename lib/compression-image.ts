/**
 * Compression des images d'événement dans le navigateur, AVANT l'envoi.
 *
 * Vercel refuse toute requête de plus de 4,5 Mo vers une fonction serveur
 * (413 « Request Entity Too Large », vérifié en prod le 2026-09-28 : 4,3 Mo
 * passent, 4,7 Mo non) — avant même notre action serveur. Or le formulaire
 * accepte jusqu'à 4 images : sans compression, une seule photo de téléphone
 * suffisait à faire échouer la création ou la modification d'un événement.
 *
 * Cible : au plus POIDS_MAX_IMAGE par image (4 × 900 Ko + champs du
 * formulaire < 4,5 Mo). Côté client uniquement (canvas) ; le serveur garde
 * ses propres contrôles (lib/images-evenement.ts).
 */

export const LARGEUR_MAX = 1600;
export const HAUTEUR_MAX = 2000;
export const POIDS_MAX_IMAGE = 900 * 1024;
/** Poids maximal d'un fichier choisi (avant compression) : une photo de téléphone récent. */
export const POIDS_MAX_ORIGINAL = 25 * 1024 * 1024;
/** Plafond du total des images envoyées : sous les 4,5 Mo de Vercel, marge pour les autres champs. */
export const POIDS_MAX_TOTAL = 4 * 1024 * 1024;

function chargerImage(fichier: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image illisible"));
    };
    img.src = url;
  });
}

function versBlob(canvas: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("conversion impossible"))), "image/jpeg", qualite)
  );
}

/**
 * Renvoie un fichier JPEG d'au plus POIDS_MAX_IMAGE, ou le fichier d'origine
 * s'il est déjà léger et aux bonnes dimensions. Lève une erreur si l'image
 * ne peut pas être lue (fichier corrompu, format non géré par le navigateur).
 */
export async function compresserImage(fichier: File): Promise<File> {
  const img = await chargerImage(fichier);
  const dejaBon = fichier.size <= POIDS_MAX_IMAGE && img.naturalWidth <= LARGEUR_MAX && img.naturalHeight <= HAUTEUR_MAX;
  if (dejaBon) return fichier;

  let echelle = Math.min(1, LARGEUR_MAX / img.naturalWidth, HAUTEUR_MAX / img.naturalHeight);
  const nom = fichier.name.replace(/\.[^.]+$/, "") + ".jpg";

  // Qualité d'abord (peu visible), puis dimensions, jusqu'à passer sous la cible.
  for (let tour = 0; tour < 6; tour++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * echelle));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * echelle));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("conversion impossible");
    // Fond blanc : un PNG transparent ne devient pas noir en JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const qualite of [0.85, 0.75, 0.65]) {
      const blob = await versBlob(canvas, qualite);
      if (blob.size <= POIDS_MAX_IMAGE) return new File([blob], nom, { type: "image/jpeg", lastModified: Date.now() });
    }
    echelle *= 0.8;
  }
  throw new Error("image trop lourde même après compression");
}
