import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { emailUtilisateur } from "@/lib/email";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE_MAX = 100;

const REFUS: Record<string, { status: number; error: string }> = {
  introuvable: { status: 404, error: "Commande introuvable" },
  evenement_pas_annule: { status: 409, error: "L'événement de cette commande n'est pas annulé." },
  pas_payee: { status: 409, error: "Cette commande n'est plus « payée » : déjà marquée remboursée ?" },
};

/**
 * « Marquer remboursé » sur une commande d'un événement annulé
 * (design/BUGS_REFONTE.md n°7), après le remboursement Mobile Money par
 * l'admin. Traçable : la commande garde qui (identifiant et nom figé),
 * quand, et la référence de l'opération si elle est saisie ; c'est le
 * justificatif si un acheteur conteste. Transition sous verrou dans
 * marquer_rembourse_annulation (20261008120000), qui revérifie tout.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;
  if (!UUID.test(params.id)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  if (reference.length > REFERENCE_MAX) return NextResponse.json({ error: `${REFERENCE_MAX} caractères au plus pour la référence` }, { status: 400 });

  // Nom figé au moment du clic : il reste lisible même si le compte admin disparaît.
  const [{ data: profil }, email] = await Promise.all([supabaseAdmin.from("profiles").select("nom").eq("id", adminId).maybeSingle(), emailUtilisateur(adminId)]);
  const nomAdmin = [profil?.nom, email ? `<${email}>` : null].filter(Boolean).join(" ") || adminId;

  const { data, error } = await supabaseAdmin.rpc("marquer_rembourse_annulation", {
    p_order_id: params.id,
    p_admin_id: adminId,
    p_admin_nom: nomAdmin,
    p_reference: reference,
  });
  if (error) {
    console.error("[api/admin/orders/rembourser-annulation] erreur :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (data !== "ok") {
    const refus = REFUS[data as string] ?? { status: 409, error: "Remboursement impossible" };
    return NextResponse.json({ error: refus.error }, { status: refus.status });
  }

  journaliserActionAdmin(adminId, "remboursement commande (événement annulé)", { order_id: params.id, ...(reference ? { reference } : {}) });
  return NextResponse.json({ ok: true, par: nomAdmin, le: new Date().toISOString() });
}
