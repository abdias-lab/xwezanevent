import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { renvoyerConfirmationCommande } from "@/lib/commandes";
import { trouverUserIdParEmail } from "@/lib/utilisateurs";

const DELAI_RELANCE_MS = 15 * 60 * 1000;
const MESSAGE_GENERIQUE =
  "Si des billets sont associés à cette adresse, un email vient d'être envoyé.";

function emailValide(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * "Retrouver mon billet" : renvoie l'email de confirmation (avec billets QR)
 * de toutes les commandes payées d'un compte, à partir de son email.
 *
 * Anti-énumération : la réponse est TOUJOURS le même message générique,
 * que l'email corresponde à un compte ou non, qu'il y ait des billets ou
 * non, ou qu'une erreur survienne — rien ne doit permettre de deviner si
 * une adresse a un compte XwézanEvent.
 *
 * Rate limit : 1 tentative de renvoi par email par 15 minutes (table
 * demandes_retrouver_billet), pour éviter le spam d'emails.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailBrut = typeof body?.email === "string" ? body.email.trim() : "";

    if (emailValide(emailBrut)) {
      const email = emailBrut.toLowerCase();

      const { data: relance } = await supabaseAdmin
        .from("demandes_retrouver_billet")
        .select("derniere_demande")
        .eq("email", email)
        .maybeSingle();

      const dejaRecent =
        !!relance &&
        Date.now() - new Date(relance.derniere_demande).getTime() < DELAI_RELANCE_MS;

      if (!dejaRecent) {
        // On enregistre la tentative avant même de savoir si un compte
        // existe : le rate limit s'applique à l'adresse saisie, pas au compte.
        await supabaseAdmin
          .from("demandes_retrouver_billet")
          .upsert({ email, derniere_demande: new Date().toISOString() });

        const userId = await trouverUserIdParEmail(email);
        if (userId) {
          const { data: commandes } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("user_id", userId)
            .eq("statut", "paye");

          for (const commande of commandes ?? []) {
            await renvoyerConfirmationCommande(commande.id).catch((e) =>
              console.error("[api/billets/retrouver] échec renvoi commande", commande.id, e)
            );
          }
        }
      }
    }
  } catch (e) {
    // On avale toute erreur : la page ne doit jamais planter, et la
    // réponse reste identique dans tous les cas.
    console.error("[api/billets/retrouver] erreur :", e);
  }

  return NextResponse.json({ message: MESSAGE_GENERIQUE });
}
