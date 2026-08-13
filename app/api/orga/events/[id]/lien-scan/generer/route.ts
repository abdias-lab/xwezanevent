import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import { journaliserAction } from "@/lib/journal";

/**
 * Génère (ou régénère) le lien de scan délégué d'un événement — un nouvel
 * UUID écrase l'ancien, qui cesse instantanément de fonctionner (plus
 * aucune ligne ne correspond à l'ancien jeton). Idempotent côté usage :
 * même bouton pour "générer" et "régénérer".
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, erreur } = await verifierProprietaireEvenement(params.id);
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ lien_scan_token: randomUUID() })
    .eq("id", params.id)
    .select("lien_scan_token")
    .single();

  if (error || !data) {
    console.error("[api/orga/lien-scan/generer] erreur :", error?.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  await journaliserAction(userId, "organisateur", "génération lien de scan", {
    event_id: params.id,
  });

  const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
  return NextResponse.json({ url: `${origine}/scan/lien/${data.lien_scan_token}` });
}
