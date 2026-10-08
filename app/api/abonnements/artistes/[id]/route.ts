import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { abonner, desabonner, estAbonne, nombreAbonnes } from "@/lib/abonnements";
import { gere } from "@/lib/artistes";

export const dynamic = "force-dynamic";

/**
 * Bouton « S'abonner » de la page artiste (components/v2/public/AbonnementArtiste.tsx,
 * design/ARTISTES.md, lot 3). La page artiste reste en cache (revalidate 60) :
 * l'état propre au visiteur est lu ici.
 * GET : { connecte, abonne, abonnes, gere } ; POST : s'abonner ; DELETE : se désabonner.
 * `gere` : le compte gère l'artiste (label, compte de l'artiste, créateur) ou
 * est admin ; affiche « Ajouter une date » (2026-10-08).
 */
async function utilisateur() {
  const {
    data: { user },
  } = await creerClientServeur().auth.getUser();
  return user;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await utilisateur();
  const [abonne, abonnes, gestion] = await Promise.all([
    user ? estAbonne(user.id, params.id) : Promise.resolve(false),
    nombreAbonnes(params.id),
    user ? peutGerer(user.id, params.id) : Promise.resolve(false),
  ]);
  return NextResponse.json({ connecte: !!user, abonne, abonnes, gere: gestion }, { headers: { "Cache-Control": "no-store" } });
}

/** Le compte gère l'artiste, ou est admin. */
async function peutGerer(userId: string, artisteId: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(artisteId)) return false;
  const [{ data: a }, { data: p }] = await Promise.all([
    supabaseAdmin.from("artistes").select("cree_par, label_id, compte_id").eq("id", artisteId).maybeSingle(),
    supabaseAdmin.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);
  return !!a && (gere(a, userId) || p?.role === "admin");
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
