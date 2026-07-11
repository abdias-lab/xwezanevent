/** Types d'image acceptés pour une affiche d'événement, mappés vers leur extension de fichier. */
export const TYPES_AFFICHE_AUTORISES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const TAILLE_AFFICHE_MAX = 5 * 1024 * 1024; // 5 Mo
