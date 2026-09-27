/**
 * Réglages communs des QR de billets (e-mails et page de confirmation).
 *
 * Scannés le soir, dehors, sur des écrans parfois peu lumineux : la
 * lisibilité passe avant l'esthétique (design/BUGS_REFONTE.md, bug #13).
 * - noir pur sur blanc pur ;
 * - zone de silence de 4 modules (minimum de la norme QR) ;
 * - correction d'erreur Q : ~25 % du code peut être abîmé ou mal éclairé ;
 * - jamais d'arrondi sur l'image : il rognait les motifs de repérage.
 */
export const OPTIONS_QR_BILLET = {
  errorCorrectionLevel: "Q" as const,
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

/** Taille d'affichage minimale du QR, en pixels CSS (e-mails et site). */
export const TAILLE_QR_AFFICHAGE = 220;

/** Largeur du PNG envoyé par e-mail : ~2× la taille affichée, net sur les écrans haute densité. */
export const LARGEUR_QR_PNG = 480;
