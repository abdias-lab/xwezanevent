import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { supprimerImageEvenement } from "@/lib/images-evenement";
import { nomAdminFige, revaliderArtiste, slugsEvenementsArtiste } from "@/lib/admin-artistes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOTIF_MAX = 1000;

/**
 * Supprimer la couverture d'un artiste, seule (décision d'Abdias du
 * 2026-10-09) : image inappropriée retirée tout de suite, sans retirer
 * l'artiste. Le bandeau repasse sur la photo floutée (ou le dégradé).
 * Conditionné à l'image vue par l'admin : une couverture remplacée entre-temps
 * n'est pas supprimée en silence (409). Fichier libéré du stockage, trace au
 * journal (image supprimée, motif facultatif, admin), page revalidée.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const vue = typeof body?.couverture === "string" ? body.couverture : "";
  const motif = typeof body?.motif === "string" ? body.motif.trim() : "";
  if (!vue) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  if (motif.length > MOTIF_MAX) return NextResponse.json({ error: `Motif trop long (${MOTIF_MAX} caractères au plus).` }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("artistes")
    .update({ couverture_url: null })
    .eq("id", params.id)
    .eq("couverture_url", vue)
    .select("id, slug, nom_scene");
  if (error) {
    console.error("[api/admin/artistes/couverture] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  const a = data?.[0];
  if (!a) return NextResponse.json({ error: "La couverture a changé ou a déjà été supprimée : recharge la page." }, { status: 409 });

  await supprimerImageEvenement(vue);
  journaliserActionAdmin(adminId, "suppression couverture artiste", { artiste_id: a.id, nom: a.nom_scene, image: vue, motif: motif || null, par: await nomAdminFige(adminId) });
  revaliderArtiste(a.slug, await slugsEvenementsArtiste(a.id));
  return NextResponse.json({ ok: true });
}
