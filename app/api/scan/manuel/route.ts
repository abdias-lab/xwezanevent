import { NextResponse, type NextRequest } from "next/server";
import { isUUID, validerBilletParCodeQr } from "@/lib/billets";
import { verifierPersonnelScan } from "@/lib/scan-auth";
import { journaliserAction } from "@/lib/journal";

/**
 * Validation manuelle d'un billet trouvé via /api/scan/recherche — quand le
 * scan QR échoue (panne réseau, caméra HS, app qui bugue). Passe par le
 * MÊME RPC `valider_billet` que le scan QR (même verrou atomique, mêmes
 * refus déjà-utilisé/annulé/événement terminé/non-autorisé) : ceci n'est
 * pas un chemin de validation alternatif, seulement une autre façon de
 * fournir le code_qr. Seule différence : on journalise explicitement que
 * la validation était manuelle, pour la traçabilité.
 */
export async function POST(req: NextRequest) {
  const { userId, role, erreur } = await verifierPersonnelScan();
  if (erreur) return erreur;

  const body = await req.json().catch(() => null);
  const code_qr: unknown = body?.code_qr;

  if (typeof code_qr !== "string" || !isUUID(code_qr)) {
    return NextResponse.json({ ok: false, raison: "inconnu" }, { status: 200 });
  }

  try {
    const resultat = await validerBilletParCodeQr(code_qr, userId);
    if (resultat.ok) {
      await journaliserAction(userId, role, "validation manuelle billet", {
        code_qr,
        nom_titulaire: resultat.nom_titulaire,
        type_billet: resultat.type_billet,
        event_titre: resultat.event_titre,
      });
    }
    return NextResponse.json(resultat);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
