import { NextResponse, type NextRequest } from "next/server";
import { isUUID, validerBilletParCodeQrEtEvenement } from "@/lib/billets";
import { resoudreEvenementParToken, compteurScan } from "@/lib/scan-liens";

/**
 * Scan QR via un lien de scan délégué (voir
 * supabase/migrations/20260811120000_lien_scan_evenement.sql). Aucune
 * session : le jeton dans le corps de la requête EST l'autorisation,
 * re-résolu vers son event_id à chaque appel — jamais un event_id fourni
 * par le client.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: unknown = body?.token;
  const code_qr: unknown = body?.code_qr;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ ok: false, raison: "non_autorise" }, { status: 200 });
  }

  const event = await resoudreEvenementParToken(token);
  if (!event) {
    return NextResponse.json({ ok: false, raison: "non_autorise" }, { status: 200 });
  }

  if (typeof code_qr !== "string" || !isUUID(code_qr)) {
    return NextResponse.json({ ok: false, raison: "inconnu" }, { status: 200 });
  }

  try {
    const resultat = await validerBilletParCodeQrEtEvenement(code_qr, event.id);
    const compteur = resultat.ok ? await compteurScan(event.id) : undefined;
    return NextResponse.json({ ...resultat, compteur });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
