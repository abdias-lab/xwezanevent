import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailEvenementValide } from "@/lib/emails/evenement-statut";

/**
 * Fait passer un événement 'en_validation' → 'publie'.
 * Le trigger prevent_unauthorized_status_change bloque cette transition pour
 * tout rôle autre que service_role : on doit donc passer par supabaseAdmin.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ statut: "publie" })
    .eq("id", params.id)
    .eq("statut", "en_validation")
    .select("id, titre, slug, organisateur_id")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/events/valider] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Événement introuvable ou déjà traité" },
      { status: 404 }
    );
  }

  journaliserActionAdmin(adminId, "validation événement", {
    event_id: data.id,
    titre: data.titre,
  });

  // Best-effort : ne fait jamais échouer la validation.
  try {
    const destinataire = await emailUtilisateur(data.organisateur_id);
    if (destinataire) {
      const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
      const { subject, html } = emailEvenementValide({
        titre: data.titre,
        lienEvenement: `${origine}/evenement/${data.slug}`,
      });
      await envoyerEmail({ to: destinataire, subject, html });
    }
  } catch (e) {
    console.error("[api/admin/events/valider] échec envoi email :", e);
  }

  return NextResponse.json({ ok: true });
}
