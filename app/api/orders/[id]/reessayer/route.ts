import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creerTransactionEtLien } from "@/lib/fedapay";
import { aujourdhuiPortoNovo } from "@/lib/date";

interface PanierLigne {
  ticket_type_id: string;
  nom: string;
  prix: number;
  quantite: number;
}

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Relance le paiement d'une commande restée en_attente (échec, annulation
 * côté FedaPay, ou FedaPay temporairement indisponible à la création) :
 * crée une NOUVELLE transaction FedaPay sur la MÊME commande — jamais de
 * commande en double, jamais de décrémentation de stock supplémentaire
 * (elle n'a lieu qu'à la finalisation réelle du paiement, cf.
 * lib/commandes.ts). Revalide au passage que l'événement et le stock sont
 * toujours disponibles (ils ont pu changer depuis la première tentative).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, event_id, total, statut, panier")
    .eq("id", params.id)
    .maybeSingle();

  if (!order || order.user_id !== user.id) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }
  if (order.statut !== "en_attente") {
    return NextResponse.json(
      { error: "Cette commande n'est plus modifiable" },
      { status: 409 }
    );
  }

  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, titre, statut, date_debut, ticket_types(id, quantite_totale, quantite_vendue)")
    .eq("id", order.event_id)
    .maybeSingle();
  if (!ev || ev.statut !== "publie" || ev.date_debut < aujourdhuiPortoNovo()) {
    return NextResponse.json(
      { error: "Cet événement n'est plus disponible à la vente" },
      { status: 409 }
    );
  }

  const dispoParId = new Map(
    (
      ev.ticket_types as { id: string; quantite_totale: number; quantite_vendue: number }[]
    ).map((t) => [t.id, t.quantite_totale - t.quantite_vendue])
  );
  const panier = (order.panier ?? []) as PanierLigne[];
  for (const l of panier) {
    const dispo = dispoParId.get(l.ticket_type_id) ?? 0;
    if (l.quantite > dispo) {
      return NextResponse.json(
        { error: `Stock insuffisant pour « ${l.nom} » (${dispo} restant)` },
        { status: 409 }
      );
    }
  }

  const nom = (user.user_metadata?.nom as string | undefined) ?? "";
  const [firstname, ...reste] = nom.trim().split(" ");
  try {
    const { id: trxId, url } = await creerTransactionEtLien({
      description: `Commande ${order.id.slice(0, 8)} — ${ev.titre}`,
      montant: order.total,
      callbackUrl: `${origine()}/paiement/retour?order=${order.id}`,
      client: {
        firstname: firstname || undefined,
        lastname: reste.join(" ") || undefined,
        email: user.email ?? undefined,
      },
    });
    await supabaseAdmin
      .from("orders")
      .update({ fedapay_transaction_id: String(trxId) })
      .eq("id", order.id);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[api/orders/reessayer] FedaPay :", e);
    return NextResponse.json(
      { error: "Paiement momentanément indisponible, réessaie dans un instant." },
      { status: 502 }
    );
  }
}
