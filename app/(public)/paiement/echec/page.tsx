import Header from "@/components/Header";
import RelancerPaiement from "@/components/RelancerPaiement";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { listeOperateursCourt } from "@/lib/telephone";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement non abouti — XwézanEvent",
};

const MESSAGES: Record<string, { titre: string; detail: string }> = {
  annule: {
    titre: "Paiement annulé",
    detail: "Tu as annulé le paiement avant sa validation. Aucune somme n'a été débitée.",
  },
  refuse: {
    titre: "Paiement refusé",
    detail:
      "L'opérateur Mobile Money a refusé la transaction. Vérifie ton solde ou réessaie avec un autre numéro.",
  },
  indisponible: {
    titre: "Paiement momentanément indisponible",
    detail: "Le service de paiement FedaPay est momentanément indisponible. Réessaie dans un instant.",
  },
  en_attente: {
    titre: "Paiement non finalisé",
    detail:
      "Nous n'avons pas encore reçu la confirmation de FedaPay pour ce paiement. Si tu as bien validé la transaction, ton billet sera confirmé automatiquement d'ici quelques instants — sinon, réessaie ci-dessous.",
  },
  defaut: {
    titre: "Paiement non abouti",
    detail: "Le paiement n'a pas pu être validé. Aucune somme n'a été débitée.",
  },
};

interface OrderRow {
  id: string;
  statut: string;
  user_id: string | null;
  events: { titre: string; slug: string; pays_code: string } | null;
}

const SELECTION_COMMANDE = "id, statut, user_id, events(titre, slug, pays_code)";

export default async function PaiementEchec({
  searchParams,
}: {
  searchParams: { order?: string; raison?: string };
}) {
  const orderId = searchParams.order;
  if (!orderId) redirect("/compte");

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compte connecté : lecture via RLS (policy `user_id = auth.uid()`).
  let order: OrderRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("orders")
      .select(SELECTION_COMMANDE)
      .eq("id", orderId)
      .maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    // Peut-être une commande invité (voir /confirmation, même logique) :
    // l'id de commande sert de jeton d'accès, pas de session à vérifier.
    const { data } = await supabaseAdmin
      .from("orders")
      .select(SELECTION_COMMANDE)
      .eq("id", orderId)
      .is("user_id", null)
      .maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    if (!user) {
      redirect(`/connexion?redirect=${encodeURIComponent(`/paiement/echec?order=${orderId}`)}`);
    }
    notFound();
  }

  // Le paiement a en fait abouti entre-temps (webhook) : direction la confirmation.
  if (order.statut === "paye") {
    redirect(`/confirmation?order=${orderId}`);
  }

  const { titre, detail } = MESSAGES[searchParams.raison ?? "defaut"] ?? MESSAGES.defaut;

  return (
    <>
      <Header />

      <main className="corps-c">
        <div className="croix" aria-hidden="true">✕</div>
        <h1>{titre}</h1>
        <p className="sous">{detail}</p>

        <RelancerPaiement orderId={order.id} />

        <p className="note-c">
          🔒 Ton paiement se fait toujours via FedaPay, de façon sécurisée
          (Mobile Money {listeOperateursCourt(order.events?.pays_code ?? "bj")}).
        </p>

        {order.events && (
          <Link className="suite" href={`/evenement/${order.events.slug}`}>
            ← Retour à « {order.events.titre} »
          </Link>
        )}
      </main>

      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/compte">Voir mes commandes</Link>
          </span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
