/**
 * Validation/normalisation des numéros Mobile Money par pays (reversements
 * organisateur, voir lib/payouts.ts) et opérateurs proposés à chaque pays.
 *
 * Pas de "server-only" ici, contrairement à lib/payouts.ts (qui l'a à cause
 * de supabaseAdmin) : cette logique ne touche à aucun secret, donc ce
 * fichier est importable tel quel côté serveur (route API) ET côté client
 * (components/orga/DemandeVirement.tsx) — plus de copie à maintenir en
 * double comme avant l'extension au Togo.
 *
 * Philosophie de normalisation (héritée de l'ancien normaliserNumeroBenin) :
 * on valide la FORME (longueur, chiffres) mais jamais la cohérence entre le
 * préfixe et l'opérateur choisi, pour ne pas rejeter à tort un numéro
 * valide sur la base d'une liste de préfixes non garantie à jour.
 */

export interface OperateurMobileMoney {
  code: string;
  nom: string;
}

export interface ConfigTelephonePays {
  indicatif: string;
  operateurs: OperateurMobileMoney[];
  normaliser: (saisie: string) => string | null;
  aide: string;
  exemple: string;
}

/**
 * Bénin : format à 10 chiffres, préfixe "01" (migration ARCEP du 30
 * novembre 2024). Tolère aussi la saisie d'un ancien numéro à 8 chiffres
 * (habitude fréquente vu la récence de la migration) en lui ajoutant
 * automatiquement le préfixe "01".
 */
function normaliserBenin(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s().-]/g, "").replace(/^\+?229/, "");
  if (/^01\d{8}$/.test(nettoye)) return nettoye;
  if (/^\d{8}$/.test(nettoye)) return "01" + nettoye;
  return null;
}

/**
 * Togo : 8 chiffres, système fermé (ARCEP Togo — indicatif +228, jamais eu
 * de migration de numérotation comme le Bénin), donc pas de tolérance
 * "ancien format à compléter" à prévoir ici.
 */
function normaliserTogo(saisie: string): string | null {
  const nettoye = saisie.replace(/[\s().-]/g, "").replace(/^\+?228/, "");
  return /^\d{8}$/.test(nettoye) ? nettoye : null;
}

export const TELEPHONE_PAR_PAYS: Record<string, ConfigTelephonePays> = {
  bj: {
    indicatif: "+229",
    operateurs: [
      { code: "mtn", nom: "MTN Mobile Money" },
      { code: "moov", nom: "Moov Money" },
      { code: "celtiis", nom: "Celtiis Money" },
    ],
    normaliser: normaliserBenin,
    aide:
      "Le numéro doit comporter 10 chiffres et commencer par 01 — exemple : 01 97 12 34 56 (un numéro à 8 chiffres sans le 01 est aussi accepté, il sera complété automatiquement).",
    exemple: "01 97 12 34 56",
  },
  tg: {
    // Flooz (Moov Africa Togo) et Mixx by Yas (Yas Togo, ex-Togocom,
    // rebrandé nov. 2024) — codes distincts par pays même si Flooz partage
    // son groupe (Moov Africa) avec le Bénin : voir
    // supabase/migrations/20260809130000_payouts_multi_pays.sql pour le
    // raisonnement (lisibilité pour Abdias qui traite les virements
    // manuellement, sans avoir à croiser avec le pays à chaque ligne).
    indicatif: "+228",
    operateurs: [
      { code: "flooz", nom: "Flooz" },
      { code: "yas", nom: "Mixx by Yas" },
    ],
    normaliser: normaliserTogo,
    aide: "Le numéro doit comporter 8 chiffres — exemple : 90 12 34 56.",
    exemple: "90 12 34 56",
  },
};

export function normaliserNumero(paysCode: string, saisie: string): string | null {
  return TELEPHONE_PAR_PAYS[paysCode]?.normaliser(saisie) ?? null;
}

export function operateursPays(paysCode: string): OperateurMobileMoney[] {
  return TELEPHONE_PAR_PAYS[paysCode]?.operateurs ?? [];
}

export function aidePays(paysCode: string): string {
  return TELEPHONE_PAR_PAYS[paysCode]?.aide ?? "";
}

export function exemplePays(paysCode: string): string {
  return TELEPHONE_PAR_PAYS[paysCode]?.exemple ?? "";
}

/** Formate un numéro normalisé pour l'affichage, quelle que soit sa longueur : "0190123456" → "01 90 12 34 56", "90123456" → "90 12 34 56". */
export function formaterNumero(n: string): string {
  return n.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}
