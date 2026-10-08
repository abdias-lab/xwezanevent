import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";

/** Longueur maximale de la note interne, doublée par la contrainte en base. */
const NOTE_MAX = 500;

/**
 * Vérifie un compte ou retire sa vérification (design/ARTISTES.md) :
 * comptes_verifies (20261001120000_artistes_abonnements.sql), table sans
 * aucun accès client. Un compte vérifié publie ses artistes et ses
 * événements sans validation admin. Retirer = supprimer la ligne ; ce qui
 * est déjà publié reste en ligne.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  if (typeof body?.verifier !== "boolean") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length > NOTE_MAX) {
    return NextResponse.json({ error: `${NOTE_MAX} caractères maximum pour la note` }, { status: 400 });
  }

  const { data: profil } = await supabaseAdmin.from("profiles").select("id, nom, nom_public").eq("id", params.id).maybeSingle();
  if (!profil) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  if (body.verifier) {
    const { error } = await supabaseAdmin
      .from("comptes_verifies")
      .upsert({ user_id: profil.id, verifie_le: new Date().toISOString(), verifie_par: adminId, note: note || null });
    if (error) {
      console.error("[api/admin/comptes/verification] vérification :", error.message);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("comptes_verifies").delete().eq("user_id", profil.id);
    if (error) {
      console.error("[api/admin/comptes/verification] retrait :", error.message);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  journaliserActionAdmin(adminId, body.verifier ? "vérification de compte" : "retrait de vérification", {
    user_id: profil.id,
    nom: profil.nom_public || profil.nom,
    ...(note ? { note } : {}),
  });
  return NextResponse.json({ ok: true });
}
