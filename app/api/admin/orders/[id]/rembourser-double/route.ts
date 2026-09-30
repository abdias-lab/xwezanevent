import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

const REFUS: Record<string, { status: number; error: string }> = {
  introuvable: { status: 404, error: "Commande introuvable" },
  pas_payee: { status: 409, error: "Cette commande n'est plus payée : déjà remboursée ?" },
  pas_en_double: { status: 409, error: "Cette commande n'a pas été payée en double : rien à rembourser ici." },
  billets_utilises: { status: 409, error: "Un billet de cette commande a déjà été scanné à l'entrée : rembourse plutôt l'autre commande." },
};

/**
 * « Marquer remboursé » sur un achat payé en double (BUGS_REFONTE n°25) :
 * après remboursement Mobile Money par l'admin, la commande en trop passe
 * « rembourse », ses billets sont annulés et les places reviennent en vente,
 * en une seule opération (fonction rembourser_achat_double,
 * 20260930140000_rembourser_achat_double.sql, qui revérifie tout).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin.rpc("rembourser_achat_double", { p_order_id: params.id });
  if (error) {
    console.error("[api/admin/orders/rembourser-double] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (data !== "ok") {
    const refus = REFUS[data as string] ?? { status: 409, error: "Remboursement impossible" };
    return NextResponse.json({ error: refus.error }, { status: refus.status });
  }

  journaliserActionAdmin(adminId, "remboursement achat en double", { order_id: params.id });
  return NextResponse.json({ ok: true });
}
