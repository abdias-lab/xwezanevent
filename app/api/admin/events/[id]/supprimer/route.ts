import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/**
 * Supprime définitivement un événement — UNIQUEMENT si aucun billet n'a
 * jamais été vendu (aucune ligne dans `tickets` pour ses ticket_types).
 * Si des billets existent, on refuse et on oriente vers l'annulation
 * (/api/admin/events/[id]/annuler), qui elle est réversible en historique
 * et ne détruit aucune donnée.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, titre")
    .eq("id", params.id)
    .maybeSingle();
  if (!event) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  const { data: types } = await supabaseAdmin
    .from("ticket_types")
    .select("id")
    .eq("event_id", event.id);
  const ticketTypeIds = (types ?? []).map((t) => t.id);

  if (ticketTypeIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("ticket_type_id", ticketTypeIds);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Des billets ont déjà été vendus pour cet événement : suppression impossible. Utilise l'annulation à la place.",
        },
        { status: 409 }
      );
    }
  }

  const { error: delError } = await supabaseAdmin
    .from("events")
    .delete()
    .eq("id", event.id);
  if (delError) {
    console.error("[api/admin/events/supprimer] erreur :", delError.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  journaliserActionAdmin(adminId, "suppression événement", {
    event_id: event.id,
    titre: event.titre,
  });

  return NextResponse.json({ ok: true });
}
