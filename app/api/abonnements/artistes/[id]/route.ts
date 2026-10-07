import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase-server";
import { abonner, desabonner, estAbonne, nombreAbonnes } from "@/lib/abonnements";

export const dynamic = "force-dynamic";

/**
 * Bouton « S'abonner » de la page artiste (components/v2/public/AbonnementArtiste.tsx,
 * design/ARTISTES.md, lot 3). La page artiste reste en cache (revalidate 60) :
 * l'état propre au visiteur est lu ici.
 * GET : { connecte, abonne, abonnes } ; POST : s'abonner ; DELETE : se désabonner.
 */
async function utilisateur() {
  const {
    data: { user },
  } = await creerClientServeur().auth.getUser();
  return user;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await utilisateur();
  const [abonne, abonnes] = await Promise.all([user ? estAbonne(user.id, params.id) : Promise.resolve(false), nombreAbonnes(params.id)]);
  return NextResponse.json({ connecte: !!user, abonne, abonnes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await utilisateur();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const fait = await abonner(user.id, params.id);
  if ("erreur" in fait) {
    return fait.erreur === "introuvable"
      ? NextResponse.json({ error: "Artiste introuvable" }, { status: 404 })
      : NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  revalidatePath(`/artiste/${fait.slug}`);
  return NextResponse.json({ abonne: true, abonnes: await nombreAbonnes(params.id) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await utilisateur();
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (!(await desabonner(user.id, params.id))) return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  return NextResponse.json({ abonne: false, abonnes: await nombreAbonnes(params.id) });
}
