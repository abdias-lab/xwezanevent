import { NextResponse, type NextRequest } from "next/server";
import { verifierAdmin } from "@/lib/admin-auth";
import { annulerEvenement } from "@/lib/annulation";

/**
 * Annule (dépublie) n'importe quel événement, quel que soit son statut
 * courant (y compris publié) — sauf s'il est déjà annulé. Voir
 * lib/annulation.ts pour les effets (billets, virements, journal).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() || undefined : undefined;

  const resultat = await annulerEvenement(params.id, adminId, "admin", motif);

  if (!resultat.ok) {
    const message =
      resultat.raison === "deja_annule"
        ? "Cet événement est déjà annulé"
        : "Événement introuvable";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  // Pas d'appel à journaliserActionAdmin ici : annuler_evenement() journalise
  // déjà l'action dans la même transaction que le changement de statut.

  return NextResponse.json(resultat);
}
