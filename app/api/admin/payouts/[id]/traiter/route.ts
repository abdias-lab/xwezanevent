import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";

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

  // Défense en profondeur : la route orga (app/api/orga/events/[id]/payouts)
  // bloque déjà les demandes prématurées, mais on reprotège ici au cas où
  // une ligne 'demande' antérieure à ce contrôle traînerait en base.
  const { data: payout, error: payoutError } = await supabaseAdmin
    .from("payouts")
    .select("id, events(date_debut)")
    .eq("id", params.id)
    .maybeSingle();

  if (payoutError) {
    console.error("[api/admin/payouts/traiter] erreur :", payoutError.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!payout) {
    return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  }

  const event = payout.events as unknown as { date_debut: string } | null;
  if (event && !payoutDisponible(event)) {
    return NextResponse.json(
      {
        error: `Les virements sont disponibles 3 jours après la tenue de l'événement (à partir du ${dateDisponibilitePayout(event)}).`,
      },
      { status: 403 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("payouts")
    .update({ statut: "traite", traite_le: new Date().toISOString() })
    .eq("id", params.id)
    .eq("statut", "demande")
    .select("id, organisateur_id, montant, moyen, numero_destination")
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
    numero_destination: data.numero_destination,
  });

  return NextResponse.json({ ok: true });
}
