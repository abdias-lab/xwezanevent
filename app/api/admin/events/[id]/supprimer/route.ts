import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/**
 * Supprime définitivement un événement — UNIQUEMENT si aucune commande
 * payée ni aucun billet n'a jamais existé pour lui. Si l'un des deux
 * existe, on refuse et on oriente vers l'annulation
 * (/api/admin/events/[id]/annuler), qui elle est réversible en historique
 * et ne détruit aucune donnée.
 *
 * Deux vérifications séparées (pas seulement `tickets`) : une commande
 * peut être `paye` sans qu'aucun billet n'ait été émis dans le cas limite
 * d'une réservation de stock refusée à la finalisation (voir
 * lib/commandes.ts::finaliserCommande, migration 20260717160000) — de
 * l'argent réel a quand même changé de main, l'événement ne doit pas être
 * supprimable silencieusement pour autant.
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

  const [{ count: commandesPayees }, { data: types }] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .eq("statut", "paye"),
    supabaseAdmin.from("ticket_types").select("id").eq("event_id", event.id),
  ]);

  const ticketTypeIds = (types ?? []).map((t) => t.id);
  let nbBillets = 0;
  if (ticketTypeIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("ticket_type_id", ticketTypeIds);
    nbBillets = count ?? 0;
  }

  if ((commandesPayees ?? 0) > 0 || nbBillets > 0) {
    return NextResponse.json(
      {
        error:
          "Des commandes ou des billets existent déjà pour cet événement : suppression impossible. Utilise l'annulation à la place.",
      },
      { status: 409 }
    );
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
