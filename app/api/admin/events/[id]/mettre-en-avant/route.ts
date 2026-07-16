import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/**
 * Coche/décoche un événement pour la bande "ticker" de l'accueil, avec un
 * ordre d'affichage optionnel. L'éligibilité réelle (statut 'publie', date à
 * venir) est revérifiée à chaque lecture par getEvenementsTicker() : cocher
 * un événement ici ne suffit pas à le rendre visible s'il ne l'est pas.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const misEnAvant = body?.misEnAvant === true;
  const ordreAffiche =
    misEnAvant && typeof body?.ordreAffiche === "number" && Number.isInteger(body.ordreAffiche)
      ? body.ordreAffiche
      : null;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ mis_en_avant: misEnAvant, ordre_affiche: ordreAffiche })
    .eq("id", params.id)
    .select("id, titre")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/events/mettre-en-avant] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }

  journaliserActionAdmin(adminId, misEnAvant ? "mise en avant" : "retrait mise en avant", {
    event_id: data.id,
    titre: data.titre,
    ordre_affiche: ordreAffiche,
  });

  return NextResponse.json({ ok: true });
}
