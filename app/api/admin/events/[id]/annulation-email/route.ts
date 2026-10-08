import { NextResponse, type NextRequest } from "next/server";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { notifierAnnulation } from "@/lib/annulation-emails";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Relance de l'e-mail d'annulation d'un événement (design/BUGS_REFONTE.md
 * n°7), après un lot Resend en échec : seules les commandes payées non
 * marquées dans notifications_annulation sont servies, jamais deux fois la
 * même. Renvoie le bilan. Pas encore de bouton dans l'admin : appel direct.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const bilan = await notifierAnnulation(params.id, `${proto}://${host}`);
  journaliserActionAdmin(adminId, "relance e-mail d'annulation", { event_id: params.id, ...bilan });
  return NextResponse.json(bilan);
}
