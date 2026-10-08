import type { Nav } from "./Coquille";

/**
 * Navigation de l'administration V2. Les URL de la prod sont conservées
 * (dont /admin/reversements) ; seule /admin/plus s'ajoute, pour regrouper
 * les entrées secondaires dans la barre basse sur mobile.
 */
export const NAV_ADMIN: Nav = {
  role: "Administration",
  entrees: [
    { cle: "accueil", libelle: "Tableau de bord", court: "Accueil", href: "/admin", icone: "home" },
    { cle: "evenements", libelle: "Événements", court: "Événements", href: "/admin/evenements", icone: "shield" },
    { cle: "virements", libelle: "Virements", court: "Virements", href: "/admin/reversements", icone: "wallet" },
    { cle: "organisateurs", libelle: "Organisateurs", court: "Orgas", href: "/admin/organisateurs", icone: "users", secondaire: true },
    { cle: "artistes", libelle: "Artistes", court: "Artistes", href: "/admin/artistes", icone: "image", secondaire: true },
    { cle: "billets", libelle: "Billets et remboursements", court: "Billets", href: "/admin/billets", icone: "ticket", secondaire: true },
    { cle: "commissions", libelle: "Commissions", court: "Commissions", href: "/admin/commissions", icone: "percent", secondaire: true },
  ],
  plus: { cle: "plus", libelle: "Plus", court: "Plus", href: "/admin/plus", icone: "more" },
};
