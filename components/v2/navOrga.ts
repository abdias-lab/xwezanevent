import type { Nav } from "./Coquille";

/**
 * Navigation de l'espace organisateur V2 (preview : v2/Coquille.tsx,
 * NAV_ORGA), sur les URL de la prod. « Créer » est l'action centrale de la
 * barre basse sur mobile.
 */
export const NAV_ORGA: Nav = {
  role: "Organisateur",
  entrees: [
    { cle: "accueil", libelle: "Tableau de bord", court: "Accueil", href: "/orga", icone: "home" },
    { cle: "scan", libelle: "Scanner les billets", court: "Scanner", href: "/scan", icone: "qr" },
    { cle: "reversements", libelle: "Mes reversements", court: "Virements", href: "/orga/reversements", icone: "wallet" },
    { cle: "artistes", libelle: "Mes artistes", court: "Artistes", href: "/orga/artistes", icone: "users" },
    { cle: "parametres", libelle: "Paramètres", court: "Réglages", href: "/orga/parametres", icone: "settings" },
  ],
  creer: { cle: "creer", libelle: "Créer un événement", court: "Créer", href: "/creer", icone: "plus" },
};
