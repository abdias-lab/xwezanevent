// Données factices de l'espace organisateur (preview V2). Aucune requête Supabase.
// Les montants suivent les règles de prod : commission 8 %, virement possible
// 3 jours après la tenue de l'événement (lib/payouts.ts), statuts identiques.

export type Statut = "publie" | "en_validation" | "brouillon" | "termine" | "refuse" | "annule";

export type TarifOrga = { nom: string; prix: number; total: number; vendus: number };

export type EvenementOrga = {
  id: string;
  titre: string;
  debut: string; // AAAA-MM-JJ
  fin?: string;
  heure: string;
  lieu: string;
  ville: string;
  pays: string;
  statut: Statut;
  categories: string[];
  description: string;
  tarifs: TarifOrga[];
  scannes: number;
  dejaDemande: number; // virements demandés ou traités
  virementLe?: string; // date à partir de laquelle un virement est possible
  lienScan: string | null;
};

export const ORGA = { nom: "Ouidah Live", email: "contact@ouidahlive.bj", nomPublic: "Ouidah Live" };
export const COMMISSION = 0.08;
export const AUJOURDHUI = "2026-09-27";

export const STATUTS: Record<Statut, string> = {
  publie: "En vente",
  en_validation: "En validation",
  brouillon: "Brouillon",
  termine: "Terminé",
  refuse: "Refusé",
  annule: "Annulé",
};

/** Statuts qui autorisent modifier / annuler (STATUTS_ANNULABLES en prod). */
export const MODIFIABLE = new Set<Statut>(["brouillon", "en_validation", "publie"]);

export const EVENEMENTS_ORGA: EvenementOrga[] = [
  {
    id: "festival-vodoun-jazz",
    titre: "Festival Vodoun Jazz",
    debut: "2026-11-13",
    fin: "2026-11-15",
    heure: "17:00",
    lieu: "Plage de Fidjrossè",
    ville: "Cotonou",
    pays: "Bénin",
    statut: "publie",
    categories: ["Festival", "Concert"],
    description:
      "Trois soirées face à l'océan : jazz, afrobeat et rythmes vodoun réinventés. Scène principale au coucher du soleil, marché d'artisans et cuisine de rue toute la soirée.",
    tarifs: [
      { nom: "Pass Standard", prix: 5000, total: 600, vendus: 558 },
      { nom: "Pass VIP", prix: 15000, total: 120, vendus: 64 },
      { nom: "Table 6 personnes", prix: 90000, total: 10, vendus: 3 },
    ],
    scannes: 0,
    dejaDemande: 0,
    virementLe: "2026-11-18",
    lienScan: "https://xwezan.com/scan/lien/k3P9xQ2vLm",
  },
  {
    id: "nuit-zinli",
    titre: "Nuit Zinli : Cotonou by Night",
    debut: "2026-10-03",
    heure: "20:00",
    lieu: "Palais des Congrès",
    ville: "Cotonou",
    pays: "Bénin",
    statut: "publie",
    categories: ["Concert"],
    description: "La grande nuit du zinli, en live avec orchestre complet.",
    tarifs: [
      { nom: "Standard", prix: 3000, total: 400, vendus: 212 },
      { nom: "Carré Or", prix: 10000, total: 50, vendus: 50 },
    ],
    scannes: 0,
    dejaDemande: 0,
    virementLe: "2026-10-06",
    lienScan: null,
  },
  {
    id: "afro-nuit-porto-novo",
    titre: "Afro Nuit Porto-Novo",
    debut: "2026-09-12",
    heure: "21:00",
    lieu: "Espace Tchif",
    ville: "Porto-Novo",
    pays: "Bénin",
    statut: "termine",
    categories: ["Soirée"],
    description: "Soirée afrobeat et coupé-décalé avec trois DJ résidents.",
    tarifs: [
      { nom: "Entrée", prix: 2000, total: 300, vendus: 287 },
      { nom: "VIP", prix: 7500, total: 40, vendus: 31 },
    ],
    scannes: 301,
    dejaDemande: 300000,
    virementLe: "2026-09-15",
    lienScan: null,
  },
  {
    id: "rire-au-palais",
    titre: "Rire au Palais : plateau d'humour",
    debut: "2026-10-10",
    heure: "19:00",
    lieu: "Centre Songhaï",
    ville: "Porto-Novo",
    pays: "Bénin",
    statut: "en_validation",
    categories: ["Humour"],
    description: "Cinq humoristes béninois sur la même scène, entrée libre sur réservation.",
    tarifs: [{ nom: "Entrée libre", prix: 0, total: 250, vendus: 0 }],
    scannes: 0,
    dejaDemande: 0,
    lienScan: null,
  },
  {
    id: "brunch-lagune",
    titre: "Brunch musical sur la lagune",
    debut: "2026-08-23",
    heure: "11:00",
    lieu: "Lagune de Cotonou",
    ville: "Cotonou",
    pays: "Bénin",
    statut: "annule",
    categories: ["Humour"],
    description: "Brunch acoustique annulé pour cause d'intempéries.",
    tarifs: [{ nom: "Brunch", prix: 8000, total: 80, vendus: 12 }],
    scannes: 0,
    dejaDemande: 0,
    lienScan: null,
  },
];

export function evenementOrga(id: string) {
  return EVENEMENTS_ORGA.find((e) => e.id === id);
}

/** Agrégats d'un événement, calculés comme sur le dashboard de prod. */
export function chiffres(e: EvenementOrga) {
  const vendus = e.tarifs.reduce((n, t) => n + t.vendus, 0);
  const capacite = e.tarifs.reduce((n, t) => n + t.total, 0);
  const brut = e.tarifs.reduce((n, t) => n + t.prix * t.vendus, 0);
  const net = Math.round(brut * (1 - COMMISSION));
  const disponible = e.statut === "annule" || e.statut === "refuse" ? 0 : Math.max(0, net - e.dejaDemande);
  const peutDemander = !!e.virementLe && e.virementLe <= AUJOURDHUI;
  return { vendus, capacite, brut, net, disponible, peutDemander };
}

export function totaux(evs: EvenementOrga[]) {
  const c = evs.map(chiffres);
  return {
    net: c.reduce((n, x) => n + x.net, 0),
    brut: c.reduce((n, x) => n + x.brut, 0),
    vendus: c.reduce((n, x) => n + x.vendus, 0),
    capacite: c.reduce((n, x) => n + x.capacite, 0),
    publies: evs.filter((e) => e.statut === "publie").length,
    disponible: c.reduce((n, x) => n + (x.peutDemander ? x.disponible : 0), 0),
  };
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
export function dateCourteOrga(d: string, fin?: string) {
  const [, m, j] = d.split("-").map(Number);
  if (fin) {
    const [, m2, j2] = fin.split("-").map(Number);
    return m === m2 ? `${j}–${j2} ${MOIS[m2 - 1]}` : `${j} ${MOIS[m - 1]} – ${j2} ${MOIS[m2 - 1]}`;
  }
  return `${j} ${MOIS[m - 1]}`;
}
export function dateAnnee(d: string) {
  const [y, m, j] = d.split("-").map(Number);
  return `${j} ${MOIS[m - 1]} ${y}`;
}
export function nombre(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}
export function montant(n: number) {
  return `${nombre(n)}\u00A0FCFA`;
}

// ---------- Billets (page détail d'événement) ----------
export type StatutBillet = "valide" | "utilise" | "annule";
export type Billet = { ref: string; nom: string; tel: string; tarif: string; statut: StatutBillet; achat: string; scanne?: string };

const PRENOMS = ["Aïcha", "Koffi", "Mariam", "Sèna", "Rodrigue", "Fifamè", "Ulrich", "Gloria", "Achille", "Nadège", "Codjo", "Esther"];
const NOMS = ["Houngbédji", "Adjovi", "Dossou", "Agossou", "Tossou", "Kpadonou", "Zinsou", "Ahouandjinou"];

export function billetsDe(e: EvenementOrga): Billet[] {
  const out: Billet[] = [];
  let i = 0;
  for (const t of e.tarifs) {
    const n = Math.min(t.vendus, t.prix > 50000 ? 3 : 6);
    for (let k = 0; k < n; k++, i++) {
      const statut: StatutBillet = e.statut === "annule" ? "annule" : e.statut === "termine" || i % 5 === 3 ? "utilise" : "valide";
      out.push({
        ref: `XWZ-${(4821 + i * 37).toString(36).toUpperCase()}`,
        nom: `${PRENOMS[i % PRENOMS.length]} ${NOMS[(i * 3) % NOMS.length]}`,
        tel: `01 9${i % 10} ${String(10 + ((i * 17) % 89)).padStart(2, "0")} ${String(20 + ((i * 29) % 79)).padStart(2, "0")} ${String(30 + ((i * 7) % 69)).padStart(2, "0")}`,
        tarif: t.nom,
        statut,
        achat: `${1 + ((i * 3) % 26)} sept. · ${String(8 + (i % 14)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
        scanne: statut === "utilise" ? `${String(21 + (i % 3)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}` : undefined,
      });
    }
  }
  return out;
}

export const STATUTS_BILLET: Record<StatutBillet, string> = { valide: "Valide", utilise: "Utilisé", annule: "Annulé" };

// ---------- Reversements ----------
export type StatutVirement = "demande" | "traite" | "gele";
export type Virement = { id: string; evenement: string; montant: number; moyen: string; numero: string; demande: string; traite?: string; statut: StatutVirement };

export const STATUTS_VIREMENT: Record<StatutVirement, string> = { demande: "En attente", traite: "Traité", gele: "Gelé" };

export const VIREMENTS: Virement[] = [
  { id: "v3", evenement: "Afro Nuit Porto-Novo", montant: 100000, moyen: "MTN Mobile Money", numero: "01 97 42 18 63", demande: "2026-09-24", statut: "demande" },
  { id: "v2", evenement: "Afro Nuit Porto-Novo", montant: 200000, moyen: "MTN Mobile Money", numero: "01 97 42 18 63", demande: "2026-09-16", traite: "2026-09-17", statut: "traite" },
  { id: "v1", evenement: "Brunch musical sur la lagune", montant: 88320, moyen: "Moov Money", numero: "01 95 30 77 12", demande: "2026-08-20", statut: "gele" },
];

export const OPERATEURS = ["MTN Mobile Money", "Moov Money", "Celtiis Money"];
export const CATEGORIES_ORGA = ["Concert", "Festival", "Culture & Vodun", "Sport", "Humour", "Soirée"];
export const VILLES = ["Cotonou", "Porto-Novo", "Ouidah", "Abomey", "Parakou", "Grand-Popo"];

/** ?etat=vide | chargement sur chaque page de l'espace. */
export type EtatPage = "normal" | "vide" | "chargement";
export function etatPage(v: string | string[] | undefined): EtatPage {
  return v === "vide" || v === "chargement" ? v : "normal";
}
