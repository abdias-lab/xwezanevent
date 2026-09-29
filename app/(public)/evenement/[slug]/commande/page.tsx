import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Icon from "@/components/v2/Icon";
import { Header } from "@/components/v2/public/Chrome";
import Commande from "@/components/v2/public/Commande";
import { dateLongue, MAX_PAR_TARIF } from "@/components/v2/public/evenement";
import { POLICES_V2 } from "@/components/v2/polices";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";
import { getEvenementParSlug } from "@/lib/events";
import { creerClientServeur } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Commande — XwézanEvent", robots: { index: false } };

/**
 * Commande (V2), reprise de la preview (v2/commande). Panier dans l'adresse
 * (?<id du tarif>=2), conservé si l'acheteur passe par la connexion. Stock
 * relu ici, et tout (prix, stock, identité) revérifié par /api/orders.
 */
export default async function PageCommande({ params, searchParams }: { params: { slug: string }; searchParams: Record<string, string | undefined> }) {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) notFound();
  if (ev.estDemo || ev.estTermine) redirect(`/evenement/${ev.slug}`);

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let compte: { nom: string; email: string } | null = null;
  if (user) {
    const { data: profil } = await supabase.from("profiles").select("nom").eq("id", user.id).maybeSingle();
    compte = { nom: profil?.nom || (user.user_metadata?.nom as string | undefined) || "", email: user.email ?? "" };
  }

  const initial: Record<string, number> = {};
  for (const t of ev.ticketTypes) {
    const n = Number(searchParams[t.id]);
    if (Number.isInteger(n) && n > 0) initial[t.id] = Math.min(n, MAX_PAR_TARIF, t.disponibles);
  }

  const heure = ev.heure ? ev.heure.slice(0, 5) : null;
  const quand = dateLongue({ debut: ev.date_debut, fin: ev.date_fin && ev.date_fin !== ev.date_debut ? ev.date_fin : undefined });

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <a href={`/evenement/${ev.slug}`} className={s.retour} style={{ marginTop: 16 }}>
          <Icon name="back" /> {ev.titre}
        </a>
        <h1 className={v.h1} style={{ margin: "8px 0 24px" }}>
          Ta <em>commande.</em>
        </h1>
        <Commande
          slug={ev.slug}
          paysCode={ev.paysCode}
          titre={ev.titre}
          quand={heure ? `${quand} · ${heure}` : quand}
          lieu={`${ev.lieu}, ${ev.ville}`}
          tarifs={ev.ticketTypes}
          initial={initial}
          compte={compte}
        />
      </main>
    </div>
  );
}
