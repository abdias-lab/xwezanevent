import { TELEPHONE_PAR_PAYS } from "@/lib/telephone";

/** "mtn" → "MTN Mobile Money" (lib/telephone.ts) ; code inconnu affiché tel quel. */
export function nomMoyen(code: string): string {
  for (const pays of Object.values(TELEPHONE_PAR_PAYS)) {
    const op = pays.operateurs.find((o) => o.code === code);
    if (op) return op.nom;
  }
  return code.toUpperCase();
}

/** "0190123456" → "01 90 12 34 56" ; autre format affiché tel quel. */
export function formaterNumero(n: string): string {
  return /^\d{10}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : n;
}
