import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { nomAdminFige, revaliderArtiste, slugsEvenementsArtiste } from "@/lib/admin-artistes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Remettre en ligne un artiste retiré : retour à « valide », page publique,
 * sections « Avec » et abonnements de nouveau actifs (rien n'avait été
 * supprimé). La trace du retrait est effacée de la fiche ; l'historique
 * (retrait puis remise en ligne) reste au journal. Conditionné au statut
 * « retire ». Pas d'e-mail « nouvelle date » rétroactif.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("artistes")
    .update({ statut: "valide", retire_le: null, retire_par: null, retire_par_nom: null, motif_retrait: null })
    .eq("id", params.id)
    .eq("statut", "retire")
    .select("id, slug, nom_scene");
  if (error) {
    console.error("[api/admin/artistes/remise-en-ligne] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  const a = data?.[0];
  if (!a) return NextResponse.json({ error: "Cet artiste n'est pas retiré : déjà en ligne ?" }, { status: 409 });

  journaliserActionAdmin(adminId, "remise en ligne artiste", { artiste_id: a.id, nom: a.nom_scene, par: await nomAdminFige(adminId) });
  revaliderArtiste(a.slug, await slugsEvenementsArtiste(a.id));
  return NextResponse.json({ ok: true });
}
