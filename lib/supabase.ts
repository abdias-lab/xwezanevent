import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables");
}

// Client navigateur (côté client) - avec clé anon
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client serveur (côté serveur) - avec clé service_role
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || "", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * IMPORTANT: Column-level privileges on profiles table
 * 
 * The profiles table has column-level SELECT restrictions:
 * - Anonymous/Public can only read: id, nom, role, created_at
 * - Authenticated users can read: id, nom, role, created_at, telephone, updated_at
 * 
 * DO NOT use select('*') - it will fail due to privilege restrictions.
 * Always explicitly list the columns you need:
 * 
 * ✅ CORRECT:
 * const { data } = await supabase
 *   .from('profiles')
 *   .select('id, nom, role, created_at');
 * 
 * ❌ WRONG:
 * const { data } = await supabase
 *   .from('profiles')
 *   .select('*');  // Will fail: column telephone not accessible
 */
