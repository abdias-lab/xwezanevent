import { type NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase-server";
import { cheminInterne } from "@/lib/redirection";

// Sous-ensemble utile de EmailOtpType (@supabase/auth-js) : évite une
// dépendance d'import fragile pour un simple type de paramètre d'URL.
type TypeOtp = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

/**
 * Route de confirmation Supabase — pattern officiel recommandé pour
 * Next.js App Router (remplace le parsing côté client du hash
 * #access_token=...&type=recovery, source des bugs précédents : plusieurs
 * instances de client Supabase se disputaient ce jeton à usage unique en
 * React Strict Mode).
 *
 * Le lien de l'email (voir le template "Reset Password" dans le dashboard
 * Supabase) pointe ici avec ?token_hash=...&type=recovery&next=/....
 * verifyOtp() échange le jeton côté SERVEUR et pose la session via les
 * cookies de la réponse — la page de destination (`next`) n'a plus qu'à
 * lire une session déjà active, aucun parsing de hash nécessaire.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as TypeOtp | null;
  // Chemin interne uniquement : sinon, un lien portant un jeton valide et
  // next=//site.com renverrait vers l'extérieur (BUGS_REFONTE #8).
  const next = cheminInterne(searchParams.get("next"));

  if (token_hash && type) {
    const supabase = creerClientServeur();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
    console.warn("[auth/confirm] verifyOtp a échoué :", error.message);
  }

  return NextResponse.redirect(
    new URL(`/reinitialiser-mot-de-passe?erreur=lien_invalide`, request.url)
  );
}
