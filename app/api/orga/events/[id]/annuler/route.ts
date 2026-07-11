import { NextResponse, type NextRequest } from "next/server";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import { annulerEvenement } from "@/lib/annulation";
import { revalidatePath } from "next/cache";

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

  return NextResponse.json(resultat);
}
