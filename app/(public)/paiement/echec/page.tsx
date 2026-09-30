import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header } from "@/components/v2/public/Chrome";
import Icon, { type IconName } from "@/components/v2/Icon";
import Relancer from "@/components/v2/compte/Relancer";
import { fcfa } from "@/components/v2/public/evenement";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Paiement non abouti — XwézanEvent", robots: { index: false } };

// Motifs définitifs uniquement (repris de la preview v2/paiement/echec). « en_attente »
// n'est plus un échec : écran d'attente de /paiement/retour (BUGS_REFONTE n°12).
const MOTIFS: Record<string, { icone: IconName; titre: string; detail: string; conseil?: string }> = {
  annule: {
    icone: "x",
    titre: "Paiement annulé",
    detail: "Tu as annulé le paiement avant sa validation. Aucune somme n'a été débitée.",
  },
  refuse: {
    icone: "alert",
    titre: "Paiement refusé",
    detail: "Ton opérateur Mobile Money a refusé la transaction. Aucune somme n'a été débitée.",
    conseil: "Vérifie ton solde, ou réessaie avec un autre numéro.",
  },
  indisponible: {
    icone: "wifi-off",
    titre: "Paiement momentanément indisponible",
    detail: "Le service de paiement FedaPay ne répond pas pour le moment. Ta commande est gardée, rien n'a été débité.",
    conseil: "Réessaie dans un instant.",
  },
  defaut: {
    icone: "alert",
    titre: "Paiement non abouti",
    detail: "Le paiement n'a pas pu être validé. Aucune somme n'a été débitée.",
  },
};

interface OrderRow {
  id: string;
  statut: string;
  total: number;
  panier: { nom: string; quantite: number }[] | null;
  events: { titre: string; slug: string } | null;
}

const SELECTION_COMMANDE = "id, statut, total, panier, events(titre, slug)";

/** Échec de paiement (V2), repris de la preview (v2/paiement/echec). ?raison=annule | refuse | indisponible. */
export default async function PaiementEchec({ searchParams }: { searchParams: { order?: string; raison?: string } }) {
  const orderId = searchParams.order;
  if (!orderId) redirect("/compte");

  // Anciens liens « en attente » : le paiement peut être en cours, jamais de
  // relance ici → écran d'attente.
  if (searchParams.raison === "en_attente") redirect(`/paiement/retour?order=${orderId}`);

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compte connecté : SA commande uniquement (filtre user_id : la RLS laisse
  // aussi un organisateur lire les commandes de ses événements, BUGS_REFONTE n°18).
  let order: OrderRow | null = null;
  if (user) {
    const { data } = await supabase.from("orders").select(SELECTION_COMMANDE).eq("id", orderId).eq("user_id", user.id).maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    // Peut-être une commande invité (voir /confirmation, même logique) :
    // l'id de commande sert de jeton d'accès, pas de session à vérifier.
    const { data } = await supabaseAdmin.from("orders").select(SELECTION_COMMANDE).eq("id", orderId).is("user_id", null).maybeSingle();
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

  const m = MOTIFS[searchParams.raison ?? "defaut"] ?? MOTIFS.defaut;
  const resume = (order.panier ?? []).map((p) => `${p.quantite} × ${p.nom}`).join(", ");
  const total = fcfa(order.total);
  const evenement = order.events ? `/evenement/${order.events.slug}` : "/evenements";

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 48 }}>
        <div className={s.vide} style={{ maxWidth: 520, margin: "0 auto" }}>
          <Icon name={m.icone} size={48} />
          <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
            {m.titre}
          </h1>
          <p className={s.videTexte}>{m.detail}</p>
          {m.conseil && <p className={s.videTexte}>{m.conseil}</p>}

          <div className={s.panneau} style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
            <p className={s.panneauTitre}>Ta commande</p>
            <p style={{ fontWeight: 700 }}>{order.events?.titre ?? "Événement"}</p>
            <p className={s.note}>{resume ? `${resume} · ${total}` : total}</p>
          </div>

          <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 360 }}>
            <Relancer orderId={order.id} total={total} />
            <Link href={evenement} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
              Modifier ma commande
            </Link>
            <Link href={evenement} className={s.note} style={{ textDecoration: "underline" }}>
              Retour à l&apos;événement
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
