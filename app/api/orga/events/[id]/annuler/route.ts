import { NextResponse, type NextRequest } from "next/server";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import { annulerEvenement } from "@/lib/annulation";
import { revalidatePath } from "next/cache";
import { notifierAnnulation } from "@/lib/annulation-emails";

/**
 * Un organisateur annule l'un de ses propres événements. Même effet que
 * l'annulation admin (voir lib/annulation.ts) ; la confirmation forte
 * (retaper le nom de l'événement) est imposée côté client, pas ici — la
 * route ne fait confiance qu'à la vérification de propriété.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId, erreur } = await verifierProprietaireEvenement(params.id);
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() || undefined : undefined;

  const resultat = await annulerEvenement(params.id, userId, "organisateur", motif);

  if (!resultat.ok) {
    const message =
      resultat.raison === "deja_annule"
        ? "Cet événement est déjà annulé"
        : "Événement introuvable";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  revalidatePath("/orga");

  // E-mail d'annulation à chaque commande payée (BUGS_REFONTE n°7) : remboursement
  // sous 14 jours. Best-effort, registre écrit après envoi réussi.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  await notifierAnnulation(params.id, `${proto}://${host}`);

  return NextResponse.json(resultat);
}
