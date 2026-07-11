import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Journalise une action sensible (admin ou organisateur) : persiste dans
 * journal_actions ET log en console serveur. Ne doit jamais faire échouer
 * l'action elle-même : un échec d'écriture du journal est avalé (log
 * d'erreur seulement), car la conséquence métier a déjà eu lieu.
 */
export async function journaliserAction(
  acteurId: string,
  acteurRole: "admin" | "organisateur",
  action: string,
  detail?: Record<string, unknown>
) {
  console.log(
    `[journal] ${new Date().toISOString()} — ${acteurRole}=${acteurId} — ${action}`,
    detail ?? ""
  );

  const { error } = await supabaseAdmin.from("journal_actions").insert({
    acteur_id: acteurId,
    acteur_role: acteurRole,
    action,
    detail: detail ?? null,
  });
  if (error) {
    console.error("[journal] échec d'écriture :", error.message);
  }
}
