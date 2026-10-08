import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailEvenementValide } from "@/lib/emails/evenement-statut";
import { notifierNouvelleDate } from "@/lib/nouvelle-date";

/**
 * Fait passer un événement 'en_validation' → 'publie'.
 * Le trigger prevent_unauthorized_status_change bloque cette transition pour
 * tout rôle autre que service_role : on doit donc passer par supabaseAdmin.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const { data, error } = await supabaseAdmin
    .from("events")
    .update({ statut: "publie" })
    .eq("id", params.id)
    .eq("statut", "en_validation")
    .select("id, titre, slug, organisateur_id, pays_code")
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
        paysCode: data.pays_code,
      });
      await envoyerEmail({ to: destinataire, subject, html });
    }
  } catch (e) {
    console.error("[api/admin/events/valider] échec envoi email :", e);
  }

  // « Nouvelle date » aux abonnés des artistes de l'affiche (design/ARTISTES.md,
  // lot 3) : si l'événement est à venir et en vente. Best-effort, dans la requête.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  await notifierNouvelleDate(data.id, `${proto}://${host}`);

  return NextResponse.json({ ok: true });
}
