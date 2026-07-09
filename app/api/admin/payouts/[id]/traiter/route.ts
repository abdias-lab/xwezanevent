import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/**
 * Marque une demande de payout 'demande' → 'traite'.
 * Le virement MoMo réel est effectué manuellement hors plateforme au MVP ;
 * cette route ne fait qu'acter que l'admin l'a traité.
 * RLS bloque déjà toute écriture sur payouts hors service_role : on passe
 * par supabaseAdmin.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin
    .from("payouts")
    .update({ statut: "traite", traite_le: new Date().toISOString() })
    .eq("id", params.id)
    .eq("statut", "demande")
    .select("id, organisateur_id, montant, moyen")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/payouts/traiter] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Demande introuvable ou déjà traitée" },
      { status: 404 }
    );
  }

  journaliserActionAdmin(adminId, "virement marqué traité", {
    payout_id: data.id,
    organisateur_id: data.organisateur_id,
    montant: data.montant,
    moyen: data.moyen,
  });

  return NextResponse.json({ ok: true });
}
