import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour les Client Components (navigateur).
 * Gère la session via cookies (compatible SSR).
 *
 * `detectSessionInUrl` peut être désactivé par l'appelant qui veut traiter
 * lui-même un jeton d'URL à usage unique (ex. lien de réinitialisation) :
 * en React Strict Mode (dev), plusieurs instances de client sont créées et
 * se disputeraient sinon ce jeton, qui n'est consommable qu'une seule fois.
 */
export function creerClientNavigateur(options?: { detectSessionInUrl?: boolean }) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options?.detectSessionInUrl === undefined
      ? undefined
      : { auth: { detectSessionInUrl: options.detectSessionInUrl } }
  );
}
