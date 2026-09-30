import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { recommencerCommande, type CommandeARecommencer } from "@/lib/commandes";

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * « Recommencer l'achat » après un paiement non abouti (BUGS_REFONTE n°25) :
 * crée une NOUVELLE commande (même acheteur, même panier, prix et stock
 * revérifiés) sans toucher à l'ancienne, dont la transaction FedaPay peut
 * rester « pending » 24 h. Voir recommencerCommande (lib/commandes.ts).
 *
 * Accès : mêmes règles que /api/orders/[id]/reessayer — session
 * propriétaire pour une commande avec compte, l'id de commande sert de
 * jeton pour une commande invité.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, statut, user_id, acheteur_nom, acheteur_email, acheteur_telephone, event_id, panier, fedapay_transaction_id, recommencee_depuis")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  let acheteurNom = order.acheteur_nom ?? "";
  let acheteurEmail = order.acheteur_email ?? "";
  if (order.user_id) {
    const supabase = creerClientServeur();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || order.user_id !== user.id) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
    }
    acheteurNom = (user.user_metadata?.nom as string | undefined) ?? "";
    acheteurEmail = user.email ?? "";
  }

  const r = await recommencerCommande({
    ancienne: order as CommandeARecommencer,
    acheteurNom,
    acheteurEmail,
    origine: origine(),
  });

  if (r.type === "paiement") return NextResponse.json({ orderId: r.orderId, url: r.url });
  if (r.type === "finalisee") return NextResponse.json({ orderId: r.orderId, finalisee: true });
  return NextResponse.json({ error: r.message }, { status: r.status });
}
