import { NextResponse, type NextRequest } from "next/server";
import { isUUID, validerBilletParCodeQr } from "@/lib/billets";
import { verifierPersonnelScan } from "@/lib/scan-auth";

export async function POST(req: NextRequest) {
  const { userId, erreur } = await verifierPersonnelScan();
  if (erreur) return erreur;

  const body = await req.json().catch(() => null);
  const code_qr: unknown = body?.code_qr;

  if (typeof code_qr !== "string" || !isUUID(code_qr)) {
    return NextResponse.json(
      { ok: false, raison: "inconnu" },
      { status: 200 }
    );
  }

  try {
    const resultat = await validerBilletParCodeQr(code_qr, userId);
    return NextResponse.json(resultat);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
