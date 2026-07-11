import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailEvenementRefuse } from "@/lib/emails/evenement-statut";

/**
 * Fait passer un événement 'en_validation' → 'refuse', avec un motif
 * optionnel communiqué à l'organisateur (par email).
 * Le trigger prevent_unauthorized_status_change bloque cette transition pour
 * tout rôle autre que service_role : on doit donc passer par supabaseAdmin.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const motif = typeof body?.motif === "string" ? body.motif.trim() || null : null;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ statut: "refuse", motif_refus: motif })
    .eq("id", params.id)
    .eq("statut", "en_validation")
    .select("id, titre, organisateur_id")
    .maybeSingle();

  if (error) {
    console.error("[api/admin/events/refuser] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Événement introuvable ou déjà traité" },
      { status: 404 }
    );
  }

  journaliserActionAdmin(adminId, "refus événement", {
    event_id: data.id,
    titre: data.titre,
    motif,
  });

  // Best-effort : ne fait jamais échouer le refus.
  try {
    const destinataire = await emailUtilisateur(data.organisateur_id);
    if (destinataire) {
      const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
      const { subject, html } = emailEvenementRefuse({
        titre: data.titre,
        motif,
        lienOrga: `${origine}/orga`,
      });
      await envoyerEmail({ to: destinataire, subject, html });
    }
  } catch (e) {
    console.error("[api/admin/events/refuser] échec envoi email :", e);
  }

  return NextResponse.json({ ok: true });
}
