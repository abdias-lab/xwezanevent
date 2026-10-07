import { NextResponse, type NextRequest } from "next/server";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { notifierNouvelleDate } from "@/lib/nouvelle-date";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Relance de l'e-mail « nouvelle date » d'un événement (design/ARTISTES.md,
 * lot 3), après un lot Resend en échec : seuls les abonnés non marqués dans
 * notifications_nouvelle_date sont servis, jamais deux fois le même. Mêmes
 * conditions que l'envoi automatique (en ligne, à venir, vente ouverte).
 * Renvoie le bilan. Pas encore de bouton dans l'admin : appel direct.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const bilan = await notifierNouvelleDate(params.id, `${proto}://${host}`);
  journaliserActionAdmin(adminId, "relance nouvelle date", { event_id: params.id, ...bilan });
  return NextResponse.json(bilan);
}
