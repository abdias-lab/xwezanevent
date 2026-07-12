import { NextResponse, type NextRequest } from "next/server";
import { envoyerEmail } from "@/lib/email";
import { emailContact } from "@/lib/emails/contact";

const DESTINATAIRE = "gbedoloabdias@gmail.com";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Formulaire de contact public. Protection anti-spam basique : un champ
 * honeypot (invisible pour un humain, souvent auto-rempli par les bots) —
 * si présent, on répond succès sans rien envoyer, pour ne pas révéler la
 * détection. L'envoi ne doit jamais faire échouer la page : toute erreur
 * est avalée et journalisée.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const nom = typeof body?.nom === "string" ? body.nom.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const piege = typeof body?.site_web === "string" ? body.site_web.trim() : "";

    // Honeypot rempli → très probablement un bot : on "réussit" sans envoyer.
    if (piege) {
      return NextResponse.json({ ok: true });
    }

    if (!nom || nom.length > 200) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    if (!email || !EMAIL_REGEX.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }
    if (!message || message.length > 5000) {
      return NextResponse.json({ error: "Message invalide" }, { status: 400 });
    }

    const { subject, html } = emailContact({ nom, email, message });
    const envoye = await envoyerEmail({ to: DESTINATAIRE, subject, html, replyTo: email });

    if (!envoye) {
      // envoyerEmail a déjà logué la cause précise ; on reste vague côté client.
      return NextResponse.json(
        { error: "Envoi impossible pour le moment, réessaie plus tard." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/contact] erreur inattendue :", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
