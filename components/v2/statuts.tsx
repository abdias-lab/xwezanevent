import s from "./espace.module.css";

// Statuts V2, repris de la preview (app/(preview)/preview-design/v2/orga/_orga.ts
// et orga/ui.tsx) : forme + libellé, jamais la couleur seule (plein / contour / barré).

export type Statut = "publie" | "en_validation" | "brouillon" | "termine" | "refuse" | "annule";

export const STATUTS: Record<Statut, string> = {
  publie: "En vente",
  en_validation: "En validation",
  brouillon: "Brouillon",
  termine: "Terminé",
  refuse: "Refusé",
  annule: "Annulé",
};

const CLS_EVT: Record<Statut, string> = {
  publie: s.stFort,
  en_validation: s.stAttente,
  brouillon: s.stNeutre,
  termine: s.stNeutre,
  refuse: s.stDanger,
  annule: s.stBarre,
};

export function StatutEvt({ statut }: { statut: Statut }) {
  return <span className={`${s.statut} ${CLS_EVT[statut]}`}>{STATUTS[statut]}</span>;
}

export type StatutBillet = "valide" | "utilise" | "annule";

export const STATUTS_BILLET: Record<StatutBillet, string> = { valide: "Valide", utilise: "Utilisé", annule: "Annulé" };

const CLS_BILLET: Record<StatutBillet, string> = { valide: s.stFort, utilise: s.stNeutre, annule: s.stBarre };

export function StatutBilletV2({ statut }: { statut: StatutBillet }) {
  return <span className={`${s.statut} ${CLS_BILLET[statut]}`}>{STATUTS_BILLET[statut]}</span>;
}

/** Statut d'un virement ; « gele » correspond à payouts.statut = 'bloque'. */
export type StatutVirement = "demande" | "traite" | "gele";

export const STATUTS_VIREMENT: Record<StatutVirement, string> = { demande: "En attente", traite: "Traité", gele: "Gelé" };

const CLS_VIR: Record<StatutVirement, string> = { demande: s.stAttente, traite: s.stFort, gele: s.stDanger };

export function StatutVirementV2({ statut }: { statut: StatutVirement }) {
  return <span className={`${s.statut} ${CLS_VIR[statut]}`}>{STATUTS_VIREMENT[statut]}</span>;
}
