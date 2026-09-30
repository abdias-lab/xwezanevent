import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/** Longueur maximale, doublée par la contrainte events_accroche_longueur (20260930120000_accroche_evenement.sql). */
const ACCROCHE_MAX = 200;

/**
 * Enregistre le texte d'accroche d'un événement, affiché sous son affiche
 * dans le bloc « Épinglé » de l'accueil. Optionnel : une chaîne vide (ou
 * faite d'espaces) enregistre NULL, et l'accueil se replie alors sur le
 * début de la description.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  if (typeof body?.accroche !== "string") {
    return NextResponse.json({ error: "Accroche invalide" }, { status: 400 });
  }
  const accroche = body.accroche.trim().replace(/\s+/g, " ");
  if (accroche.length > ACCROCHE_MAX) {
    return NextResponse.json({ error: `${ACCROCHE_MAX} caractères maximum` }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ accroche: accroche || null })
    .eq("id", params.id)
    .select("id, titre")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/events/accroche] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  journaliserActionAdmin(adminId, "accroche", { event_id: data.id, titre: data.titre, accroche: accroche || null });

  return NextResponse.json({ ok: true, accroche: accroche || null });
}
