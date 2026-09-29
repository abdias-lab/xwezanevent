import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing Supabase service role environment variables");
}

// Client serveur (côté serveur uniquement) - avec clé service_role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  // Jamais de cache de données Next : Next 14 met en cache les fetch GET des
  // Server Components (ici avec une validité d'un an), même sous
  // `dynamic = "force-dynamic"`, dès que la page ne lit pas les cookies.
  // Une page qui ne passe que par ce client lisait alors une copie figée de
  // la base (ex. /paiement/retour : commande vue « en_attente » après son
  // paiement). BUGS_REFONTE n°22.
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
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
