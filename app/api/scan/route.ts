import { NextResponse, type NextRequest } from "next/server";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function POST(req: NextRequest) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["organisateur", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const code_qr: unknown = body?.code_qr;

  if (typeof code_qr !== "string" || !isUUID(code_qr)) {
    return NextResponse.json(
      { ok: false, raison: "inconnu" },
      { status: 200 }
    );
  }

  const { data, error } = await supabaseAdmin.rpc("valider_billet", {
    p_code_qr: code_qr,
    p_user_id: user.id,
  });

  if (error) {
    console.error("[api/scan] RPC error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }

  return NextResponse.json(data);
}
