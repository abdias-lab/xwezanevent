import "server-only";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase-admin";

let client: Resend | null = null;
function resend(): Resend {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

/**
 * Expéditeur des emails. Tant qu'aucun domaine n'est vérifié sur Resend,
 * il DOIT rester "onboarding@resend.dev" (seul expéditeur admis en mode
 * test) — une fois un domaine vérifié, il suffit de définir
 * RESEND_FROM_EMAIL (ex. "XwézanEvent <billets@xwezanevent.com>") en
 * variable d'environnement : aucun changement de code ailleurs.
 */
export const EXPEDITEUR_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "XwézanEvent <onboarding@resend.dev>";

interface EnvoiEmail {
  to: string;
  subject: string;
  html: string;
  /** Permet au destinataire de répondre directement à l'expéditeur d'origine (ex. formulaire de contact). */
  replyTo?: string;
}

/**
 * Envoie un email via Resend. Ne lance JAMAIS d'exception : retourne
 * `false` et logue en cas d'échec (clé absente, domaine non vérifié,
 * erreur réseau...), pour ne jamais faire échouer l'opération métier qui
 * déclenche l'envoi (paiement validé, événement validé/refusé...).
 */
export async function envoyerEmail({ to, subject, html, replyTo }: EnvoiEmail): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY absente — email "${subject}" à ${to} non envoyé`);
    return false;
  }
  try {
    const { data, error } = await resend().emails.send({
      from: EXPEDITEUR_EMAIL,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) {
      console.error(`[email] échec d'envoi "${subject}" à ${to} :`, error);
      return false;
    }
    console.log(`[email] envoyé "${subject}" à ${to} (id=${data?.id})`);
    return true;
  } catch (e) {
    console.error(`[email] exception à l'envoi de "${subject}" à ${to} :`, e);
    return false;
  }
}

/**
 * Email d'un utilisateur via l'API admin — profiles ne stocke pas
 * l'email (voir lib/supabase-admin.ts), il faut passer par auth.users.
 */
export async function emailUtilisateur(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}
