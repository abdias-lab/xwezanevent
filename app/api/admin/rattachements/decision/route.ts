import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { deciderProposition } from "@/lib/artistes";
import { notifierNouvelleDate } from "@/lib/nouvelle-date";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Décision de l'admin sur un rattachement proposé (design/ARTISTES.md,
 * lot 2), quand le label ou le compte de l'artiste ne répond pas. Même
 * transition que depuis Mes artistes (deciderProposition) : conditionnée au
 * statut « propose », une décision déjà prise (par le label entre-temps, ou
 * dans un autre onglet) est refusée sans rien modifier. Action journalisée ;
 * l'organisateur voit le résultat sur la fiche de son événement.
 */
export async function POST(req: NextRequest) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const { eventId, artisteId, action } = (body ?? {}) as Record<string, unknown>;
  if (typeof eventId !== "string" || !UUID.test(eventId) || typeof artisteId !== "string" || !UUID.test(artisteId) || (action !== "accepter" && action !== "refuser")) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const fait = await deciderProposition(eventId, artisteId, action, adminId);
  if (!fait) return NextResponse.json({ error: "Cette proposition a déjà été traitée." }, { status: 409 });

  journaliserActionAdmin(adminId, `rattachement : ${action}`, { event_id: eventId, artiste_id: artisteId });
  if (action === "accepter") {
    // « Nouvelle date » aux abonnés de l'artiste si l'événement est en ligne, à venir et en vente (lot 3).
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    await notifierNouvelleDate(eventId, `${proto}://${host}`, [artisteId]);
  }
  if (fait.evenement) revalidatePath(`/evenement/${fait.evenement}`);
  if (fait.artiste) revalidatePath(`/artiste/${fait.artiste}`);
  return NextResponse.json({ ok: true });
}
