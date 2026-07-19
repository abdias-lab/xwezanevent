import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Recherche paginée par email (l'API admin Supabase ne filtre pas par
 * email — il faut parcourir listUsers() page par page).
 */
export async function trouverUserIdParEmail(email: string): Promise<string | null> {
  const perPage = 200;
  const cible = email.toLowerCase();
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error || !data) return null;
    const trouve = data.users.find((u) => u.email?.toLowerCase() === cible);
    if (trouve) return trouve.id;
    if (data.users.length < perPage) return null;
  }
}
