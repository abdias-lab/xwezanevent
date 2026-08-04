import Header from "@/components/Header";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Confirmation — XwézanEvent",
};

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateHeure(dateISO: string, heure: string | null): string {
  const [annee, mois, jour] = dateISO.split("-");
  const d = `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
  if (!heure) return d;
  const [h, m] = heure.split(":");
  return `${d} · ${h}h${m}`;
}

// Cette page est accessible par id de commande seul pour un achat invité
// (voir plus bas) : si cette URL fuite, l'email affiché ne doit pas être
// lisible en clair par un tiers — seul le premier caractère reste visible.
function masquerEmail(email: string): string {
  const [local, domaine] = email.split("@");
  if (!local || !domaine) return email;
  return `${local[0]}•••@${domaine}`;
}

interface OrderRow {
  id: string;
  total: number;
  statut: string;
  user_id: string | null;
  acheteur_nom: string | null;
  acheteur_email: string | null;
  events: {
    titre: string;
    date_debut: string;
    heure: string | null;
    lieu: string;
    ville: string;
  } | null;
  tickets: { id: string; code_qr: string; ticket_types: { nom: string } | null }[];
}

const SELECTION_COMMANDE =
  "id, total, statut, user_id, acheteur_nom, acheteur_email, events(titre, date_debut, heure, lieu, ville), tickets(id, code_qr, ticket_types(nom))";

export default async function Confirmation({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const orderId = searchParams.order;
  if (!orderId) notFound();

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compte connecté : lecture via RLS (policy `user_id = auth.uid()`) —
  // ne renvoie jamais la commande d'un autre compte, ni une commande
  // invité (voir supabase/migrations/20260804120000_achat_invite.sql).
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
    // Pas trouvé via RLS (pas connecté, ou connecté mais pas propriétaire) :
    // peut-être une commande invité. Elle n'a pas de session à vérifier —
    // l'id de commande (UUID non devinable) sert de jeton d'accès, comme
    // /paiement/retour le fait déjà pour toutes les commandes.
    const { data } = await supabaseAdmin
      .from("orders")
      .select(SELECTION_COMMANDE)
      .eq("id", orderId)
      .is("user_id", null)
      .maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    // Ni RLS, ni commande invité : exige la connexion (comportement
    // historique, ex. lien confirmation d'un compte consulté déconnecté).
    if (!user) {
      redirect(`/connexion?redirect=${encodeURIComponent(`/confirmation?order=${orderId}`)}`);
    }
    notFound();
  }

  const ev = order.events;
  if (!ev) notFound();

  const paye = order.statut === "paye";

  const numero = `#XWZ-${order.id.slice(0, 8).toUpperCase()}`;
  const titulaire = order.user_id
    ? ((user?.user_metadata?.nom as string | undefined) ?? user?.email ?? "")
    : (order.acheteur_nom ?? "");
  const emailAffiche = masquerEmail(
    order.user_id ? (user?.email ?? "") : (order.acheteur_email ?? "")
  );
  const dateHeure = formatDateHeure(ev.date_debut, ev.heure);

  // Les billets ne sont générés qu'à la finalisation du paiement (voir
  // finaliserCommande) : tant que statut !== "paye", order.tickets est vide.
  // On ne génère les QR que dans ce cas, pour ne jamais laisser un visuel de
  // succès s'afficher sur une commande non payée.
  const billets = paye
    ? await Promise.all(
        order.tickets.map(async (t) => ({
          id: t.id,
          nom: t.ticket_types?.nom ?? "Billet",
          qr: await QRCode.toString(t.code_qr, {
            type: "svg",
            margin: 1,
            width: 150,
            color: { dark: "#151009", light: "#ffffff" },
          }),
        }))
      )
    : [];

  return (
    <>
      <Header />

      <main className="corps-c">
        {paye ? (
          <>
            <div className="coche" aria-hidden="true">✓</div>
            <h1>Paiement confirmé !</h1>
            <p className="sous">
              {billets.length > 1 ? "Tes billets sont confirmés" : "Ton billet est confirmé"}{" "}
              · envoyé à <b>{emailAffiche}</b>
            </p>

            {billets.map((b) => (
              <div className="billet" key={b.id} aria-label="E-billet">
                <div className="haut">
                  <div className="applique" aria-hidden="true" />
                  <h2>{ev.titre}</h2>
                  <p>
                    📅 {dateHeure} &nbsp;·&nbsp; 📍 {ev.lieu}, {ev.ville}
                  </p>
                </div>
                <div className="separation" />
                <div className="bas">
                  <div className="detail">
                    <div className="l">Billet</div>
                    <div className="v">{b.nom}</div>
                    <div className="l">Titulaire</div>
                    <div className="v">{titulaire}</div>
                    <div className="l">N° de commande</div>
                    <div className="v num">{numero}</div>
                  </div>
                  <div
                    className="zone-qr"
                    dangerouslySetInnerHTML={{
                      __html: `${b.qr}<span class="scan">Scanner à l'entrée</span>`,
                    }}
                  />
                </div>
              </div>
            ))}

            <p className="note-c">
              Présente ce QR code à l&apos;entrée de l&apos;événement.
              <br />
              Un email de confirmation t&apos;a été envoyé.
            </p>
          </>
        ) : (
          <>
            <div className="sablier" aria-hidden="true">⏳</div>
            <h1>Paiement en cours de vérification</h1>
            <p className="sous">
              Nous n&apos;avons pas encore reçu la confirmation de FedaPay pour cette
              commande. Si le paiement a bien été validé, ton billet apparaîtra
              automatiquement ici et dans « Mes billets » d&apos;ici quelques instants.
            </p>
          </>
        )}

        <Link className="suite" href="/compte">
          Voir mes billets →
        </Link>
      </main>

      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/evenements">← Tous les événements</Link>
          </span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
