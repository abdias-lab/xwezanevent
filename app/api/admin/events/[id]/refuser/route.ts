import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/**
 * Fait passer un événement 'en_validation' → 'refuse'.
 * Le trigger prevent_unauthorized_status_change bloque cette transition pour
 * tout rôle autre que service_role : on doit donc passer par supabaseAdmin.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ statut: "refuse" })
    .eq("id", params.id)
    .eq("statut", "en_validation")
    .select("id, titre")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/events/refuser] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Événement introuvable ou déjà traité" },
      { status: 404 }
    );
  }

  journaliserActionAdmin(adminId, "refus événement", {
    event_id: data.id,
    titre: data.titre,
  });

  return NextResponse.json({ ok: true });
}
