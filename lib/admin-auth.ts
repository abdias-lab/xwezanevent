import "server-only";
import { NextResponse } from "next/server";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface AdminAutorise {
  adminId: string;
  erreur: null;
}
interface AdminRefuse {
  adminId: null;
  erreur: NextResponse;
}

/**
 * Vérifie côté serveur (jamais confiance au front) que l'appelant est
 * connecté ET a le rôle 'admin'. À appeler en tout début de chaque route
 * API d'administration.
 */
export async function verifierAdmin(): Promise<AdminAutorise | AdminRefuse> {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      adminId: null,
      erreur: NextResponse.json({ error: "Connexion requise" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return {
      adminId: null,
      erreur: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }

  return { adminId: user.id, erreur: null };
}

/** Journalise toute action admin en console serveur (id admin + horodatage). */
export function journaliserActionAdmin(
  adminId: string,
  action: string,
  detail?: Record<string, unknown>
) {
  console.log(
    `[admin] ${new Date().toISOString()} — admin=${adminId} — ${action}`,
    detail ?? ""
  );
}
