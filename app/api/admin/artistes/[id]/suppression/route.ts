import { NextResponse, type NextRequest } from "next/server";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { supprimerImageEvenement } from "@/lib/images-evenement";
import { nomAdminFige, revaliderArtiste } from "@/lib/admin-artistes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Supprimer définitivement un artiste (décisions d'Abdias du 2026-10-08) :
 * seulement sans aucun rattachement ni abonné. Le contrôle est refait SOUS
 * VERROU par supprimer_artiste (20261009120000) au moment de la suppression :
 * ce que la page affichait ne compte pas, un abonné arrivé entre-temps bloque
 * la suppression. La fiche disparaissant, la trace va au journal (instantané :
 * nom, slug, statut, admin). La photo est retirée du stockage.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc("supprimer_artiste", { p_artiste_id: params.id });
  if (error) {
    console.error("[api/admin/artistes/suppression] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  const r = data as { resultat: string; rattachements?: number; abonnes?: number; nom?: string; slug?: string; statut?: string; photo_url?: string | null };
  if (r.resultat === "introuvable") return NextResponse.json({ error: "Artiste introuvable : déjà supprimé ?" }, { status: 404 });
  if (r.resultat === "lie") {
    const raisons = [
      r.rattachements ? `rattaché à ${r.rattachements} événement${r.rattachements > 1 ? "s" : ""}` : null,
      r.abonnes ? `${r.abonnes} abonné${r.abonnes > 1 ? "s" : ""}` : null,
    ].filter(Boolean);
    return NextResponse.json(
      { error: `Suppression impossible : ${raisons.join(" et ")}. Utilise le retrait.`, rattachements: r.rattachements, abonnes: r.abonnes },
      { status: 409 },
    );
  }

  if (r.photo_url) await supprimerImageEvenement(r.photo_url);
  journaliserActionAdmin(adminId, "suppression artiste", { artiste_id: params.id, nom: r.nom, slug: r.slug, statut: r.statut, par: await nomAdminFige(adminId) });
  if (r.slug) revaliderArtiste(r.slug, []);
  // Aucun rattachement par construction : aucune page d'événement à remettre à jour.
  return NextResponse.json({ ok: true });
}
