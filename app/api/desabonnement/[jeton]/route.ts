import { NextResponse, type NextRequest } from "next/server";
import { desabonnerParJeton } from "@/lib/abonnements";

export const dynamic = "force-dynamic";

/**
 * Désabonnement en un clic natif des messageries (RFC 8058) : l'e-mail
 * « nouvelle date » porte les en-têtes List-Unsubscribe (cette adresse) et
 * List-Unsubscribe-Post: List-Unsubscribe=One-Click. Gmail ou Outlook
 * envoient alors un POST ici, sans ouvrir de page. Idempotent : un jeton
 * inconnu ou déjà utilisé répond 200 aussi (rien à divulguer).
 */
export async function POST(_req: NextRequest, { params }: { params: { jeton: string } }) {
  await desabonnerParJeton(params.jeton);
  return NextResponse.json({ ok: true });
}
