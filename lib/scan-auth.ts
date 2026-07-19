import "server-only";
import { NextResponse } from "next/server";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface PersonnelAutorise {
  userId: string;
  role: "organisateur" | "admin";
  erreur: null;
}
interface PersonnelRefuse {
  userId: null;
  role: null;
  erreur: NextResponse;
}

/**
 * Vérifie que l'appelant est connecté ET a le rôle organisateur ou admin —
 * même garde que le scan QR (/api/scan), réutilisée par la recherche et la
 * validation manuelles. Le scoping par événement (un organisateur ne
 * voit/valide que ses propres billets) est fait séparément, en base, par
 * `valider_billet` et par `rechercherBillets` — cette fonction ne fait que
 * la garde de rôle globale.
 */
export async function verifierPersonnelScan(): Promise<PersonnelAutorise | PersonnelRefuse> {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      role: null,
      erreur: NextResponse.json({ error: "Connexion requise" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["organisateur", "admin"].includes(profile.role)) {
    return {
      userId: null,
      role: null,
      erreur: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }

  return { userId: user.id, role: profile.role as "organisateur" | "admin", erreur: null };
}
