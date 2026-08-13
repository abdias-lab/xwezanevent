import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import { journaliserAction } from "@/lib/journal";

/** Révoque le lien de scan délégué d'un événement — effet immédiat, aucune session à invalider (voir lib/scan-liens.ts, le jeton est re-résolu à chaque requête). */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, erreur } = await verifierProprietaireEvenement(params.id);
  if (erreur) return erreur;

  const { error } = await supabaseAdmin
    .from("events")
    .update({ lien_scan_token: null })
    .eq("id", params.id);

  if (error) {
    console.error("[api/orga/lien-scan/revoquer] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  await journaliserAction(userId, "organisateur", "révocation lien de scan", {
    event_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
