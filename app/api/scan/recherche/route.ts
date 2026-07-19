import { NextResponse, type NextRequest } from "next/server";
import { rechercherBillets } from "@/lib/billets";
import { verifierPersonnelScan } from "@/lib/scan-auth";

/**
 * Filet de secours si le scan QR échoue (panne réseau, caméra HS, app qui
 * bugue) : retrouve un billet par nom d'acheteur, email, ou référence de
 * commande. Ne fait AUCUNE validation — seulement une recherche en
 * lecture. La validation elle-même passe par /api/scan/manuel, qui
 * réutilise le même RPC que le scan QR.
 */
export async function POST(req: NextRequest) {
  const { userId, role, erreur } = await verifierPersonnelScan();
  if (erreur) return erreur;

  const body = await req.json().catch(() => null);
  const q: unknown = body?.q;
  if (typeof q !== "string" || q.trim().length === 0) {
    return NextResponse.json({ billets: [] });
  }

  try {
    const billets = await rechercherBillets(q, role === "admin" ? null : userId);
    return NextResponse.json({ billets });
  } catch (e) {
    console.error("[api/scan/recherche] :", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
