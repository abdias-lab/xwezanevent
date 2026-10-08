import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { NOM_SCENE_MAX } from "@/lib/artistes";
import { nomAdminFige, revaliderArtiste, slugsEvenementsArtiste } from "@/lib/admin-artistes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Corriger le nom affiché d'un artiste (BUGS_REFONTE A9, décision d'Abdias du
 * 2026-10-08) : « R-k zik » → « R-K Zik ». Pas de règle automatique de casse
 * (elle ne devinerait pas « R-K » et abîmerait « DJ Shado ») : l'admin saisit
 * l'écriture exacte de l'artiste, enregistrée telle quelle (espaces superflus
 * retirés). Le slug ne change pas : les liens partagés restent valides. Trace
 * au journal (ancien nom, nouveau, admin) ; page de l'artiste et sections
 * « Avec » remises à jour.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const nom = typeof body?.nom === "string" ? body.nom.trim().replace(/\s+/g, " ") : "";
  if (!nom || nom.length > NOM_SCENE_MAX) return NextResponse.json({ error: `Indique le nom de scène (${NOM_SCENE_MAX} caractères au plus).` }, { status: 400 });

  const { data: avant } = await supabaseAdmin.from("artistes").select("id, slug, nom_scene").eq("id", params.id).maybeSingle();
  if (!avant) return NextResponse.json({ error: "Artiste introuvable" }, { status: 404 });
  if (avant.nom_scene === nom) return NextResponse.json({ ok: true, nom, inchange: true });

  // Conditionné à l'ancien nom : deux corrections simultanées ne s'écrasent pas en silence.
  const { data: maj, error } = await supabaseAdmin.from("artistes").update({ nom_scene: nom }).eq("id", avant.id).eq("nom_scene", avant.nom_scene).select("id");
  if (error) {
    console.error("[api/admin/artistes/nom] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!maj?.length) return NextResponse.json({ error: "Le nom vient d'être modifié ailleurs : recharge la page." }, { status: 409 });

  journaliserActionAdmin(adminId, "correction nom artiste", { artiste_id: avant.id, ancien: avant.nom_scene, nouveau: nom, par: await nomAdminFige(adminId) });
  revaliderArtiste(avant.slug, await slugsEvenementsArtiste(avant.id));
  return NextResponse.json({ ok: true, nom });
}
