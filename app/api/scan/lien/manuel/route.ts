import { NextResponse, type NextRequest } from "next/server";
import { isUUID, validerBilletParCodeQrEtEvenement } from "@/lib/billets";
import { resoudreEvenementParToken, compteurScan } from "@/lib/scan-liens";
import { journaliserAction } from "@/lib/journal";

/**
 * Validation manuelle via un lien de scan délégué — même RPC que le scan
 * QR (/api/scan/lien/valider), seule différence : journalisée comme
 * "validation manuelle" pour la traçabilité, avec acteur_id NULL (personne
 * n'a de compte ici, voir supabase/migrations/20260810120000_journal_actions_acteur_id_set_null.sql
 * qui a rendu cette colonne nullable) et un détail explicite `delegated`.
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
    if (resultat.ok) {
      await journaliserAction(null, "lien_scan", "validation manuelle billet", {
        event_id: event.id,
        delegated: true,
        code_qr,
        nom_titulaire: resultat.nom_titulaire,
        type_billet: resultat.type_billet,
        event_titre: resultat.event_titre,
      });
    }
    const compteur = resultat.ok ? await compteurScan(event.id) : undefined;
    return NextResponse.json({ ...resultat, compteur });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
