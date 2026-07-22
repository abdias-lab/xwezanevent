import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signaturePanier, creerTransactionPourCommande } from "@/lib/commandes";
import { aujourdhuiPortoNovo } from "@/lib/date";

interface ItemSaisi {
  id: string;
  qte: number;
}
interface TicketTypeRow {
  id: string;
  nom: string;
  prix: number;
  quantite_totale: number;
  quantite_vendue: number;
}

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Au-delà de cette ancienneté, une commande en_attente est considérée
// abandonnée : on ne la réutilise plus, on la clôt pour laisser un nouvel
// achat légitime (même panier) passer.
const FENETRE_REUTILISATION_MS = 30 * 60 * 1000;

// L'INSERT ci-dessous peut entrer en conflit avec l'index unique partiel
// créé par supabase/migrations/20260720120000_dedoublonnage_commandes_en_attente.sql —
// un conflit dessus signifie « même utilisateur + même événement + même
// panier a déjà une commande en_attente ».
const TENTATIVES_MAX = 3;

/**
 * Crée une commande + initialise le paiement FedaPay.
 * - Prix et stock recalculés/validés CÔTÉ SERVEUR (jamais le front).
 * - Modèle économique : l'acheteur paie EXACTEMENT le prix affiché du
 *   billet (aucun frais de service ajouté par XwézanEvent — seuls les
 *   frais Mobile Money éventuels de FedaPay s'appliquent, hors de notre
 *   contrôle). La commission XwézanEvent (6%) est prélevée côté
 *   organisateur, au moment du reversement (voir lib/payouts.ts).
 * - Commande créée en « en_attente » avec un snapshot du panier.
 * - Les billets ne sont générés qu'après paiement (webhook / retour).
 */
export async function POST(req: NextRequest) {
  // 1. Authentification
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Connexion requise", redirect: "/connexion" },
      { status: 401 }
    );
  }

  // 2. Entrée
  const body = await req.json().catch(() => null);
  const slug: string | undefined = body?.slug;
  const items: ItemSaisi[] = Array.isArray(body?.items) ? body.items : [];
  if (!slug || items.length === 0) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // 3. Événement publié + types de billets (source de vérité des prix/stock)
  const { data: ev } = await supabaseAdmin
    .from("events")
    .select("id, titre, date_debut, est_demo, ticket_types(id, nom, prix, quantite_totale, quantite_vendue)")
    .eq("slug", slug)
    .eq("statut", "publie")
    .maybeSingle();
  if (!ev) {
    return NextResponse.json({ error: "Événement introuvable" }, { status: 404 });
  }
  // Événement vitrine (démo, voir supabase/migrations/20260722120000_evenements_demo.sql) :
  // jamais de commande réelle, quel que soit le chemin d'appel (le bouton
  // désactivé côté client n'est qu'un confort, ce garde-fou est le vrai verrou).
  if (ev.est_demo) {
    return NextResponse.json(
      { error: "Cet événement est une démonstration : la billetterie n'est pas activée." },
      { status: 403 }
    );
  }
  // Vérifié par DATE, pas seulement par statut : reste correct même si
  // cloturer_evenements_passes()/pg_cron n'est pas encore passé sur cet
  // événement (voir supabase/migrations/20260712120000_evenements_termines.sql).
  if (ev.date_debut < aujourdhuiPortoNovo()) {
    return NextResponse.json(
      { error: "Cet événement est terminé, la billetterie est fermée" },
      { status: 409 }
    );
  }
  const parId = new Map<string, TicketTypeRow>(
    (ev.ticket_types as TicketTypeRow[]).map((t) => [t.id, t])
  );

  // 4. Recalcul serveur + vérification du stock
  const panier: { ticket_type_id: string; nom: string; prix: number; quantite: number }[] = [];
  let sousTotal = 0;
  for (const it of items) {
    const tt = parId.get(it?.id);
    const q = Math.floor(Number(it?.qte));
    if (!tt || !Number.isFinite(q) || q <= 0) continue;
    const dispo = tt.quantite_totale - tt.quantite_vendue;
    if (q > dispo) {
      return NextResponse.json(
        { error: `Stock insuffisant pour « ${tt.nom} » (${dispo} restant)` },
        { status: 409 }
      );
    }
    panier.push({ ticket_type_id: tt.id, nom: tt.nom, prix: tt.prix, quantite: q });
    sousTotal += tt.prix * q;
  }
  if (panier.length === 0) {
    return NextResponse.json({ error: "Sélection vide" }, { status: 400 });
  }

  // L'acheteur paie exactement le prix des billets : pas de frais de
  // service XwézanEvent ajoutés. frais_service reste à 0 (colonne
  // conservée pour compat historique / traçabilité, plus jamais
  // alimentée depuis le 2026-07-12 — voir /tarifs).
  const total = sousTotal;
  const signature = signaturePanier(panier);

  // 5a. Repli déjà payé pour ce panier exact : l'index unique partiel ne
  // couvre QUE statut='en_attente' (volontairement, pour ne jamais bloquer
  // un futur achat légitime — voir la migration) — une commande payée
  // n'entre donc plus en conflit avec un nouvel INSERT identique, ce qui
  // laisserait passer un doublon derrière un paiement déjà effectué. Pas
  // racy pour la sécurité financière : si le paiement se produit PENDANT
  // cette requête (juste après ce SELECT), l'INSERT plus bas entrera en
  // conflit avec la ligne encore en_attente à ce moment-là et sera
  // rattrapé par la résolution de conflit (23505) juste après.
  const { data: dejaPayee } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", ev.id)
    .eq("panier_signature", signature)
    .eq("statut", "paye")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (dejaPayee) {
    return NextResponse.json(
      {
        error: "Tu as déjà une commande payée pour cette sélection.",
        orderId: dejaPayee.id,
        dejaPayee: true,
      },
      { status: 409 }
    );
  }

  // 5b. Commande en attente (avec snapshot du panier), dédupliquée par
  // contrainte DB (voir supabase/migrations/20260720120000_...) : deux
  // requêtes concurrentes avec le même panier ne peuvent pas toutes les
  // deux insérer — Postgres refuse la seconde avec l'erreur 23505, qu'on
  // résout ci-dessous (jamais un simple SELECT-puis-INSERT pour CE cas-là,
  // sujet à la même race).
  let orderId: string | null = null;
  for (let tentative = 0; tentative < TENTATIVES_MAX && !orderId; tentative++) {
    const { data: order, error: errOrder } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        event_id: ev.id,
        sous_total: sousTotal,
        frais_service: 0,
        total,
        statut: "en_attente",
        panier,
        panier_signature: signature,
      })
      .select("id")
      .single();

    if (!errOrder && order) {
      orderId = order.id;
      break;
    }

    // Code Postgres 23505 = violation de contrainte unique. La seule
    // contrainte unique sur `orders` en dehors de la clé primaire (id,
    // généré serveur, collision non plausible) est l'index de déduplication
    // ci-dessus : inutile de parser le message pour l'identifier.
    const estConflitDedupe = errOrder?.code === "23505";
    if (!estConflitDedupe) {
      console.error("[api/orders] création commande :", errOrder?.message);
      return NextResponse.json(
        { error: "Création de la commande impossible" },
        { status: 500 }
      );
    }

    // Une commande en_attente identique existe déjà : retrouve celle qui a
    // provoqué le conflit pour décider quoi en faire.
    const { data: existante } = await supabaseAdmin
      .from("orders")
      .select("id, statut, created_at")
      .eq("user_id", user.id)
      .eq("event_id", ev.id)
      .eq("panier_signature", signature)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existante) {
      // Conflit déjà résolu entre-temps par un autre appel : retente.
      continue;
    }

    if (existante.statut === "paye") {
      // L'autre onglet/tentative a été payée pendant qu'on traitait cette
      // requête : ne jamais créer de doublon derrière un paiement déjà
      // effectué — informer l'acheteur plutôt que de le refacturer.
      return NextResponse.json(
        {
          error: "Tu as déjà une commande payée pour cette sélection.",
          orderId: existante.id,
          dejaPayee: true,
        },
        { status: 409 }
      );
    }

    if (existante.statut !== "en_attente") {
      // Clôturée entre-temps (ex. par une autre requête concurrente) :
      // le champ n'est plus couvert par l'index unique, on peut retenter.
      continue;
    }

    const ancienneteMs = Date.now() - new Date(existante.created_at).getTime();
    if (ancienneteMs < FENETRE_REUTILISATION_MS) {
      // Même intention d'achat récente (double-clic, onglet dupliqué...) :
      // on réutilise cette commande plutôt que d'en créer une nouvelle.
      orderId = existante.id;
      break;
    }

    // Tentative abandonnée (> 30 min) : on la clôt pour laisser un nouvel
    // achat légitime du même panier passer, puis on retente la création.
    await supabaseAdmin
      .from("orders")
      .update({ statut: "echoue" })
      .eq("id", existante.id)
      .eq("statut", "en_attente");
  }

  if (!orderId) {
    return NextResponse.json(
      { error: "Création de la commande impossible, réessaie." },
      { status: 500 }
    );
  }

  // 6. Transaction FedaPay + lien de paiement (toujours une nouvelle
  // transaction, y compris pour une commande réutilisée — un lien
  // FedaPay est à usage unique).
  const nom = (user.user_metadata?.nom as string | undefined) ?? "";
  const [firstname, ...reste] = nom.trim().split(" ");
  try {
    const { url } = await creerTransactionPourCommande({
      orderId,
      eventTitre: ev.titre,
      total,
      callbackUrl: `${origine()}/paiement/retour?order=${orderId}`,
      client: {
        firstname: firstname || undefined,
        lastname: reste.join(" ") || undefined,
        email: user.email ?? undefined,
      },
    });
    return NextResponse.json({ url, orderId });
  } catch (e) {
    console.error("[api/orders] FedaPay :", e);
    return NextResponse.json(
      { error: "Paiement momentanément indisponible", orderId },
      { status: 502 }
    );
  }
}
