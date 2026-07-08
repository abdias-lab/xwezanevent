import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase pour les Server Components / Route Handlers / Server Actions.
 * Lit et rafraîchit la session via les cookies de la requête.
 */
export function creerClientServeur() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Dans un Server Component, l'écriture de cookies échoue : le
          // rafraîchissement de session est assuré par le middleware.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* noop en RSC */
          }
        },
      },
    }
  );
}
