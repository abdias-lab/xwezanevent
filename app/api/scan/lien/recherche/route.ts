import { NextResponse, type NextRequest } from "next/server";
import { rechercherBillets } from "@/lib/billets";
import { resoudreEvenementParToken } from "@/lib/scan-liens";

/**
 * Filet de secours (recherche par nom/email/référence) via un lien de scan
 * délégué — identique à /api/scan/recherche, scopé à un seul event_id
 * (résolu depuis le jeton) au lieu de tous les événements d'un
 * organisateur. Ne fait aucune validation, lecture seule.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token: unknown = body?.token;
  const q: unknown = body?.q;

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ billets: [] });
  }

  const event = await resoudreEvenementParToken(token);
  if (!event) {
    return NextResponse.json({ billets: [] });
  }

  if (typeof q !== "string" || q.trim().length === 0) {
    return NextResponse.json({ billets: [] });
  }

  try {
    const billets = await rechercherBillets(q, [event.id]);
    return NextResponse.json({ billets });
  } catch (e) {
    console.error("[api/scan/lien/recherche] :", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
