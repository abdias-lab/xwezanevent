import "server-only";
import { createClient } from "@supabase/supabase-js";

function creerClientAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase service role environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let client: ReturnType<typeof creerClientAdmin> | null = null;

// Client serveur (côté serveur uniquement) - avec clé service_role.
// Créé au premier usage, pas au chargement du module : sans la clé, le build
// passe et seule une requête qui en a réellement besoin échoue. C'est ce qui
// permet les déploiements Preview de Vercel sans clé service_role (previews
// de la refonte, données fictives). En production, la clé est présente :
// comportement inchangé.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof creerClientAdmin>, {
  get(_, prop) {
    client ??= creerClientAdmin();
    const valeur = Reflect.get(client, prop, client);
    return typeof valeur === "function" ? valeur.bind(client) : valeur;
  },
});

/**
 * IMPORTANT: Column-level privileges on profiles table
 * 
 * The profiles table has column-level SELECT restrictions:
 * - Anonymous/Public can only read: id, nom, role, created_at
 * - Authenticated users can read: id, nom, role, created_at, telephone, updated_at
 * - Service role (this client) has full access to all columns
 * 
 * This client uses service_role key and must ONLY be used server-side.
 * Never import this in client-side code - the 'server-only' guard will prevent it.
 * 
 * ✅ SERVER-SIDE ONLY:
 * import { supabaseAdmin } from '@/lib/supabase-admin';
 * const { data } = await supabaseAdmin
 *   .from('orders')
 *   .insert({ ... });
 * 
 * ❌ DO NOT USE IN CLIENT-SIDE CODE
 */
