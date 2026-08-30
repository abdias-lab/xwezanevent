import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { creerTransactionPourCommande, finaliserCommande } from "@/lib/commandes";
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
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, acheteur_nom, acheteur_email, event_id, total, statut, panier")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  // Identité de l'acheteur pour la relance : compte connecté (exige la
  // session propriétaire, comme avant), ou commande invité — celle-ci n'a
  // pas de session à vérifier, l'id de commande dans l'URL sert de jeton
  // d'accès (même modèle que /paiement/retour, /confirmation,
  // /paiement/echec — voir supabase/migrations/20260804120000_achat_invite.sql).
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

  if (order.statut !== "en_attente") {
    return NextResponse.json(
      { error: "Cette commande n'est plus modifiable" },
      { status: 409 }
    );
  }

  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, titre, statut, date_debut, date_fin, est_demo, ticket_types(id, quantite_totale, quantite_vendue)")
    .eq("id", order.event_id)
    .maybeSingle();
  if (!ev || ev.statut !== "publie" || (ev.date_fin ?? ev.date_debut) < aujourdhuiPortoNovo()) {
    return NextResponse.json(
      { error: "Cet événement n'est plus disponible à la vente" },
      { status: 409 }
    );
  }
  // Même garde que /api/orders (défense en profondeur) : un événement
  // vitrine ne devrait jamais avoir de commande à relancer si le premier
  // verrou a fonctionné, mais on ne fait confiance à aucun chemin d'appel.
  if (ev.est_demo) {
    return NextResponse.json(
      { error: "Cet événement est une démonstration : la billetterie n'est pas activée." },
      { status: 403 }
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

  // Commande gratuite restée en_attente (ex. créée avant l'ajout de ce
  // filet — voir app/api/orders/route.ts) : finalise directement, ne
  // retente jamais FedaPay, qui refuserait un montant à 0 F de la même
  // façon que la première fois.
  if (order.total === 0) {
    const resultat = await finaliserCommande(order.id, 0);
    if (resultat === "ok" || resultat === "deja") {
      return NextResponse.json({ orderId: order.id, gratuit: true });
    }
    console.error(`[api/orders/reessayer] échec finalisation commande gratuite ${order.id} : ${resultat}`);
    return NextResponse.json(
      { error: "Impossible de finaliser la commande, réessaie." },
      { status: 500 }
    );
  }

  const [firstname, ...reste] = acheteurNom.trim().split(" ");
  try {
    const { url } = await creerTransactionPourCommande({
      orderId: order.id,
      eventTitre: ev.titre,
      total: order.total,
      callbackUrl: `${origine()}/paiement/retour?order=${order.id}`,
      client: {
        firstname: firstname || undefined,
        lastname: reste.join(" ") || undefined,
        email: acheteurEmail || undefined,
      },
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[api/orders/reessayer] FedaPay :", e);
    return NextResponse.json(
      { error: "Paiement momentanément indisponible, réessaie dans un instant." },
      { status: 502 }
    );
  }
}
