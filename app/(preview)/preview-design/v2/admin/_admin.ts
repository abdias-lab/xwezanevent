// Données factices de l'espace admin (preview V2). Aucune requête Supabase.
// Règles alignées sur la prod : commission par événement (8 % par défaut),
// virement possible à J+3 de la date de référence (lib/payouts.ts, 87b7e85).
import type { Nav } from "../Coquille";
import { B } from "../Coquille";
import { AUJOURDHUI, type Statut } from "../orga/_orga";

export const A = `${B}/admin`;

export const NAV_ADMIN: Nav = {
  role: "Administration",
  entrees: [
    { cle: "accueil", libelle: "Tableau de bord", court: "Accueil", href: A, icone: "home" },
    { cle: "evenements", libelle: "Événements", court: "Événements", href: `${A}/evenements`, icone: "shield" },
    { cle: "virements", libelle: "Virements", court: "Virements", href: `${A}/virements`, icone: "wallet" },
    { cle: "organisateurs", libelle: "Organisateurs", court: "Orgas", href: `${A}/organisateurs`, icone: "users", secondaire: true },
    { cle: "billets", libelle: "Billets et remboursements", court: "Billets", href: `${A}/billets`, icone: "ticket", secondaire: true },
    { cle: "commissions", libelle: "Commissions", court: "Commissions", href: `${A}/commissions`, icone: "percent", secondaire: true },
  ],
  plus: { cle: "plus", libelle: "Plus", court: "Plus", href: `${A}/plus`, icone: "more" },
  compte: { nom: "Équipe Xwézan", email: "contact@xwezan.com" },
};

export type TarifAdmin = { nom: string; prix: number; total: number; vendus: number };

export type EvenementAdmin = {
  id: string;
  titre: string;
  organisateur: string; // id d'ORGANISATEURS
  debut: string;
  fin?: string;
  heure: string;
  lieu: string;
  ville: string;
  statut: Statut;
  soumisLe: string; // AAAA-MM-JJ
  categories: string[];
  description: string;
  tarifs: TarifAdmin[];
  image: "portrait" | "paysage" | "carre" | null;
  commission: number;
  motifRefus?: string;
  aLaUne?: boolean; // events.mis_en_avant
};

export type Organisateur = {
  id: string;
  nom: string; // nom personnel (profiles.nom), jamais public
  nomPublic: string | null;
  email: string;
  tel: string;
  inscritLe: string;
};

export const ORGANISATEURS: Organisateur[] = [
  { id: "o1", nom: "Rodrigue Houngbédji", nomPublic: "Ouidah Live", email: "contact@ouidahlive.bj", tel: "01 97 42 18 63", inscritLe: "2026-07-14" },
  { id: "o2", nom: "Mariam Adjovi", nomPublic: "Lagune Sessions", email: "mariam.adjovi@exemple.bj", tel: "01 95 30 77 12", inscritLe: "2026-08-02" },
  { id: "o3", nom: "Codjo Tossou", nomPublic: null, email: "codjo.tossou@exemple.bj", tel: "01 96 11 48 20", inscritLe: "2026-09-20" },
  { id: "o4", nom: "Esther Kpadonou", nomPublic: "Rire Bénin", email: "esther@rirebenin.bj", tel: "01 91 73 05 44", inscritLe: "2026-08-28" },
  { id: "o5", nom: "Achille Zinsou", nomPublic: "Parakou Sound", email: "achille.zinsou@exemple.bj", tel: "01 94 62 39 81", inscritLe: "2026-09-25" },
];

export const EVENEMENTS_ADMIN: EvenementAdmin[] = [
  // ---- En attente de validation (du plus ancien au plus récent) ----
  {
    id: "rire-au-palais",
    titre: "Rire au Palais : plateau d'humour",
    organisateur: "o4",
    debut: "2026-10-10",
    heure: "19:00",
    lieu: "Centre Songhaï",
    ville: "Porto-Novo",
    statut: "en_validation",
    soumisLe: "2026-09-24",
    categories: ["Humour"],
    description: "Cinq humoristes béninois sur la même scène, entrée libre sur réservation.",
    tarifs: [{ nom: "Entrée libre", prix: 0, total: 250, vendus: 0 }],
    image: "paysage",
    commission: 0.08,
  },
  {
    id: "parakou-sound-system",
    titre: "Parakou Sound System",
    organisateur: "o5",
    debut: "2026-11-07",
    fin: "2026-11-08",
    heure: "18:00",
    lieu: "Stade municipal",
    ville: "Parakou",
    statut: "en_validation",
    soumisLe: "2026-09-26",
    categories: ["Festival", "Concert"],
    description: "Deux soirs de sound system dans le nord.",
    tarifs: [
      { nom: "Pass 1 jour", prix: 2500, total: 1500, vendus: 0 },
      { nom: "Pass 2 jours", prix: 4000, total: 800, vendus: 0 },
      { nom: "Carré VIP", prix: 75000, total: 20, vendus: 0 },
    ],
    image: null,
    commission: 0.08,
  },
  {
    id: "soiree-gospel",
    titre: "Nuit du gospel",
    organisateur: "o3",
    debut: "2026-10-18",
    heure: "20:00",
    lieu: "Église Saint-Michel",
    ville: "Cotonou",
    statut: "en_validation",
    soumisLe: "2026-09-27",
    categories: ["Concert", "Culture & Vodun"],
    description:
      "Chorales de Cotonou, Porto-Novo et Abomey réunies pour une nuit de gospel et de chants traditionnels, avec un final commun. Buvette sur place, parking gardé.",
    tarifs: [
      { nom: "Standard", prix: 2000, total: 600, vendus: 0 },
      { nom: "Premier rang", prix: 5000, total: 60, vendus: 0 },
    ],
    image: "portrait",
    commission: 0.08,
  },
  // ---- Autres statuts ----
  {
    id: "festival-vodoun-jazz",
    titre: "Festival Vodoun Jazz",
    organisateur: "o1",
    debut: "2026-11-13",
    fin: "2026-11-15",
    heure: "17:00",
    lieu: "Plage de Fidjrossè",
    ville: "Cotonou",
    statut: "publie",
    soumisLe: "2026-08-19",
    categories: ["Festival", "Concert"],
    description: "Trois soirées face à l'océan.",
    tarifs: [
      { nom: "Pass Standard", prix: 5000, total: 600, vendus: 558 },
      { nom: "Pass VIP", prix: 15000, total: 120, vendus: 64 },
      { nom: "Table 6 personnes", prix: 90000, total: 10, vendus: 3 },
    ],
    image: "paysage",
    commission: 0.08,
    aLaUne: true,
  },
  {
    id: "nuit-zinli",
    titre: "Nuit Zinli : Cotonou by Night",
    organisateur: "o1",
    debut: "2026-10-03",
    heure: "20:00",
    lieu: "Palais des Congrès",
    ville: "Cotonou",
    statut: "publie",
    soumisLe: "2026-08-27",
    categories: ["Concert"],
    description: "La grande nuit du zinli.",
    tarifs: [
      { nom: "Standard", prix: 3000, total: 400, vendus: 212 },
      { nom: "Carré Or", prix: 10000, total: 50, vendus: 50 },
    ],
    image: "carre",
    commission: 0.08,
  },
  {
    id: "afro-nuit-porto-novo",
    titre: "Afro Nuit Porto-Novo",
    organisateur: "o1",
    debut: "2026-09-12",
    heure: "21:00",
    lieu: "Espace Tchif",
    ville: "Porto-Novo",
    statut: "termine",
    soumisLe: "2026-08-10",
    categories: ["Soirée"],
    description: "Soirée afrobeat et coupé-décalé.",
    tarifs: [
      { nom: "Entrée", prix: 2000, total: 300, vendus: 287 },
      { nom: "VIP", prix: 7500, total: 40, vendus: 31 },
    ],
    image: "paysage",
    commission: 0.08,
  },
  {
    id: "lagune-acoustique",
    titre: "Sessions acoustiques sur la lagune",
    organisateur: "o2",
    debut: "2026-09-19",
    heure: "17:30",
    lieu: "Ponton de Ganvié",
    ville: "Cotonou",
    statut: "termine",
    soumisLe: "2026-08-12",
    categories: ["Concert"],
    description: "Concerts acoustiques en pirogue.",
    tarifs: [{ nom: "Pirogue", prix: 6000, total: 90, vendus: 84 }],
    image: "portrait",
    commission: 0,
  },
  {
    id: "brunch-lagune",
    titre: "Brunch musical sur la lagune",
    organisateur: "o2",
    debut: "2026-08-23",
    heure: "11:00",
    lieu: "Lagune de Cotonou",
    ville: "Cotonou",
    statut: "annule",
    soumisLe: "2026-08-05",
    categories: ["Humour"],
    description: "Annulé pour cause d'intempéries.",
    tarifs: [{ nom: "Brunch", prix: 8000, total: 80, vendus: 12 }],
    image: null,
    commission: 0.08,
  },
  {
    id: "karaoke-geant",
    titre: "Karaoké géant",
    organisateur: "o3",
    debut: "2026-10-02",
    heure: "21:00",
    lieu: "À préciser",
    ville: "Cotonou",
    statut: "refuse",
    soumisLe: "2026-09-21",
    categories: ["Soirée"],
    description: "Karaoké.",
    tarifs: [{ nom: "Entrée", prix: 1500, total: 200, vendus: 0 }],
    image: null,
    commission: 0.08,
    motifRefus: "Lieu non précisé et description trop courte : indique la salle exacte et le déroulé de la soirée.",
  },
];

export type StatutVirementAdmin = "demande" | "bloque" | "traite";

export type VirementAdmin = {
  id: string;
  organisateur: string;
  evenement: string; // id d'EVENEMENTS_ADMIN
  montant: number;
  moyen: string;
  numero: string;
  demandeLe: string; // AAAA-MM-JJ HH:MM
  statut: StatutVirementAdmin;
  traiteLe?: string;
};

export const VIREMENTS_ADMIN: VirementAdmin[] = [
  { id: "p6", organisateur: "o2", evenement: "lagune-acoustique", montant: 504000, moyen: "Moov Money", numero: "01 66 20 14 09", demandeLe: "2026-09-26 10:42", statut: "demande" },
  { id: "p5", organisateur: "o1", evenement: "afro-nuit-porto-novo", montant: 100000, moyen: "MTN Mobile Money", numero: "01 97 42 18 63", demandeLe: "2026-09-24 18:05", statut: "demande" },
  // Demande antérieure au contrôle J+3 : l'événement n'a pas encore eu lieu.
  { id: "p4", organisateur: "o1", evenement: "nuit-zinli", montant: 250000, moyen: "MTN Mobile Money", numero: "01 97 42 18 63", demandeLe: "2026-09-22 09:13", statut: "demande" },
  { id: "p3", organisateur: "o2", evenement: "brunch-lagune", montant: 88320, moyen: "Moov Money", numero: "01 95 30 77 12", demandeLe: "2026-08-20 16:30", statut: "bloque" },
  { id: "p2", organisateur: "o1", evenement: "afro-nuit-porto-novo", montant: 200000, moyen: "MTN Mobile Money", numero: "01 97 42 18 63", demandeLe: "2026-09-16 08:20", statut: "traite", traiteLe: "2026-09-17 11:02" },
];

export const organisateur = (id: string) => ORGANISATEURS.find((o) => o.id === id)!;
export const evenementAdmin = (id: string) => EVENEMENTS_ADMIN.find((e) => e.id === id);
export const nomAffiche = (o: Organisateur) => o.nomPublic ?? o.nom;

function plus(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
/** Date à partir de laquelle un virement est éligible (J+3 de la date de référence). */
export const eligibleLe = (e: EvenementAdmin) => plus(e.fin ?? e.debut, 3);
export const estEligible = (e: EvenementAdmin) => AUJOURDHUI >= eligibleLe(e);

export function chiffresAdmin(e: EvenementAdmin) {
  const vendus = e.tarifs.reduce((n, t) => n + t.vendus, 0);
  const capacite = e.tarifs.reduce((n, t) => n + t.total, 0);
  const brut = e.tarifs.reduce((n, t) => n + t.prix * t.vendus, 0);
  const commission = Math.round(brut * e.commission);
  return { vendus, capacite, brut, commission, net: brut - commission };
}

/** Jours écoulés depuis une date AAAA-MM-JJ, par rapport à AUJOURDHUI. */
export function joursDepuis(d: string) {
  return Math.round((Date.parse(`${AUJOURDHUI}T00:00:00Z`) - Date.parse(`${d.slice(0, 10)}T00:00:00Z`)) / 86400000);
}
export function depuis(d: string) {
  const n = joursDepuis(d);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} jours`;
}

// ---------- Billets (page Billets et remboursements) ----------
export type StatutBilletAdmin = "valide" | "utilise" | "annule";
export type BilletAdmin = {
  ref: string;
  commande: string;
  evenement: string; // id d'EVENEMENTS_ADMIN
  tarif: string;
  prix: number;
  nom: string;
  tel: string;
  email: string;
  invite: boolean; // achat sans compte (orders.acheteur_*)
  statut: StatutBilletAdmin;
  acheteLe: string; // AAAA-MM-JJ HH:MM
  rembourse?: string; // date de remboursement, billets d'événements annulés
};

const PRENOMS_A = ["Aïcha", "Koffi", "Mariam", "Sèna", "Rodrigue", "Fifamè", "Ulrich", "Gloria", "Achille", "Nadège", "Codjo", "Esther", "Hermann", "Bénédicta"];
const NOMS_A = ["Houngbédji", "Adjovi", "Dossou", "Agossou", "Tossou", "Kpadonou", "Zinsou", "Ahouandjinou", "Gbaguidi"];

/** Échantillon de billets par événement vendu (quelques-uns par tarif, pas la totalité). */
export const BILLETS_ADMIN: BilletAdmin[] = (() => {
  const out: BilletAdmin[] = [];
  let i = 0;
  for (const e of EVENEMENTS_ADMIN) {
    for (const t of e.tarifs) {
      const n = Math.min(t.vendus, e.statut === "annule" ? 12 : 4);
      for (let k = 0; k < n; k++, i++) {
        const prenom = PRENOMS_A[i % PRENOMS_A.length];
        const nom = NOMS_A[(i * 5) % NOMS_A.length];
        const statut: StatutBilletAdmin = e.statut === "annule" ? "annule" : e.statut === "termine" || i % 4 === 1 ? "utilise" : "valide";
        out.push({
          ref: `XWZ-${(9120 + i * 53).toString(36).toUpperCase()}`,
          commande: `c${1000 + Math.floor(i / 2)}`,
          evenement: e.id,
          tarif: t.nom,
          prix: t.prix,
          nom: `${prenom} ${nom}`,
          tel: `01 9${i % 10} ${String(10 + ((i * 17) % 89)).padStart(2, "0")} ${String(20 + ((i * 29) % 79)).padStart(2, "0")} ${String(30 + ((i * 7) % 69)).padStart(2, "0")}`,
          email: `${prenom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@exemple.bj`,
          invite: i % 3 === 0,
          statut,
          acheteLe: `2026-${e.statut === "annule" ? "08" : "09"}-${String(1 + ((i * 3) % 26)).padStart(2, "0")} ${String(8 + (i % 14)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
          rembourse: e.statut === "annule" && k < 4 ? "2026-08-27" : undefined,
        });
      }
    }
  }
  return out;
})();
