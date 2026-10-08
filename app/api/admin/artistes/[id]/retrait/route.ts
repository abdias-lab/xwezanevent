import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { emailUtilisateur, envoyerEmail } from "@/lib/email";
import { emailArtisteRetire } from "@/lib/emails/artiste-retrait";
import { decideurs } from "@/lib/artistes";
import { nomAdminFige, revaliderArtiste, slugsEvenementsArtiste } from "@/lib/admin-artistes";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MOTIF_MAX = 1000;

/**
 * Retirer un artiste en ligne (décisions d'Abdias du 2026-10-08) : page en
 * 404, absent des sections « Avec », plus d'e-mail « nouvelle date ». Fiche,
 * rattachements et abonnements restent en base : réversible
 * (remise-en-ligne). Trace sur la fiche (qui, nom figé, quand, motif) et au
 * journal. E-mail au compte qui gère l'artiste seulement si `prevenir`.
 * Transition conditionnée au statut « valide » : un double clic ne fait rien.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() : "";
  const prevenir = body?.prevenir !== false;
  if (motif.length > MOTIF_MAX) return NextResponse.json({ error: `${MOTIF_MAX} caractères au plus pour le motif` }, { status: 400 });

  const nomAdmin = await nomAdminFige(adminId);
  const { data: retire, error } = await supabaseAdmin
    .from("artistes")
    .update({ statut: "retire", retire_le: new Date().toISOString(), retire_par: adminId, retire_par_nom: nomAdmin, motif_retrait: motif || null })
    .eq("id", params.id)
    .eq("statut", "valide")
    .select("id, slug, nom_scene, label_id, compte_id, cree_par");
  if (error) {
    console.error("[api/admin/artistes/retrait] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  const a = retire?.[0];
  if (!a) return NextResponse.json({ error: "Cet artiste n'est pas en ligne : déjà retiré ?" }, { status: 409 });

  let prevenus = 0;
  if (prevenir) {
    const { subject, html } = emailArtisteRetire({ nom: a.nom_scene, motif: motif || null });
    for (const id of decideurs(a)) {
      const to = await emailUtilisateur(id);
      if (to && (await envoyerEmail({ to, subject, html }))) prevenus++;
    }
  }

  journaliserActionAdmin(adminId, "retrait artiste", { artiste_id: a.id, nom: a.nom_scene, ...(motif ? { motif } : {}), prevenir, prevenus });
  revaliderArtiste(a.slug, await slugsEvenementsArtiste(a.id));
  return NextResponse.json({ ok: true, par: nomAdmin, prevenus });
}
