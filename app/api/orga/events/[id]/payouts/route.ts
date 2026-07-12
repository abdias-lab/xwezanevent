import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import {
  montantDisponible,
  MOYENS_PAIEMENT,
  type MoyenPaiement,
  dateDisponibilitePayout,
  payoutDisponible,
} from "@/lib/payouts";
import { journaliserAction } from "@/lib/journal";

/**
 * Un organisateur demande le virement du solde (tout ou partie) d'un de
 * ses événements. Le montant demandé n'est jamais pris tel quel côté
 * client : on recalcule le disponible côté serveur et on plafonne dessus.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, erreur } = await verifierProprietaireEvenement(params.id);
  if (erreur) return erreur;

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("statut, date_debut")
    .eq("id", params.id)
    .single();

  // Fail-closed : si l'événement ou sa date n'a pas pu être chargé, on
  // refuse la demande plutôt que de sauter silencieusement le contrôle.
  if (eventError || !event) {
    console.error("[api/orga/payouts] événement introuvable ou erreur de lecture :", eventError?.message);
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  if (event.statut === "annule" || event.statut === "refuse") {
    return NextResponse.json(
      { error: "Cet événement n'accepte plus de nouvelles demandes de virement" },
      { status: 409 }
    );
  }

  if (!payoutDisponible(event)) {
    return NextResponse.json(
      {
        error: `Les virements sont disponibles 3 jours après la tenue de l'événement (à partir du ${dateDisponibilitePayout(event)}).`,
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const moyen = body?.moyen as unknown;
  if (typeof moyen !== "string" || !MOYENS_PAIEMENT.includes(moyen as MoyenPaiement)) {
    return NextResponse.json({ error: "Moyen de paiement invalide" }, { status: 400 });
  }

  const disponible = await montantDisponible(params.id);
  if (disponible <= 0) {
    return NextResponse.json({ error: "Aucun solde disponible pour cet événement" }, { status: 409 });
  }

  const montantDemande = Number(body?.montant);
  const montant = Number.isFinite(montantDemande) && montantDemande > 0
    ? Math.min(Math.round(montantDemande), disponible)
    : disponible;

  const { data: payout, error: insertError } = await supabaseAdmin
    .from("payouts")
    .insert({
      organisateur_id: userId,
      event_id: params.id,
      montant,
      moyen,
      statut: "demande",
    })
    .select("id")
    .single();

  if (insertError || !payout) {
    console.error("[api/orga/payouts] erreur :", insertError?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  await journaliserAction(userId, "organisateur", "demande de virement", {
    payout_id: payout.id,
    event_id: params.id,
    montant,
    moyen,
  });

  return NextResponse.json({ ok: true, montant });
}
