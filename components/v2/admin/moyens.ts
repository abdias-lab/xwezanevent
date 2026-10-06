import { TELEPHONE_PAR_PAYS, formaterNumero as formaterTelephone } from "@/lib/telephone";

/** "mtn" → "MTN Mobile Money" (lib/telephone.ts) ; code inconnu affiché tel quel. */
export function nomMoyen(code: string): string {
  for (const pays of Object.values(TELEPHONE_PAR_PAYS)) {
    const op = pays.operateurs.find((o) => o.code === code);
    if (op) return op.nom;
  }
  return code.toUpperCase();
}

/** "0190123456" → "01 90 12 34 56", "+2290190123456" → "+229 01 90 12 34 56" : même règle que lib/telephone.ts. */
export const formaterNumero = formaterTelephone;
