import Header from "@/components/Header";
import { creerClientServeur } from "@/lib/supabase-server";
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

interface OrderRow {
  id: string;
  total: number;
  statut: string;
  events: {
    titre: string;
    date_debut: string;
    heure: string | null;
    lieu: string;
    ville: string;
  } | null;
  tickets: { id: string; code_qr: string; ticket_types: { nom: string } | null }[];
}

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
  if (!user) {
    redirect(`/connexion?redirect=${encodeURIComponent(`/confirmation?order=${orderId}`)}`);
  }

  // RLS : l'utilisateur ne peut lire que ses propres commandes / billets
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, total, statut, events(titre, date_debut, heure, lieu, ville), tickets(id, code_qr, ticket_types(nom))"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) notFound();
  const order = data as unknown as OrderRow;
  const ev = order.events;
  if (!ev) notFound();

  const numero = `#XWZ-${order.id.slice(0, 8).toUpperCase()}`;
  const titulaire =
    (user.user_metadata?.nom as string | undefined) ?? user.email ?? "";
  const dateHeure = formatDateHeure(ev.date_debut, ev.heure);

  // Génère un QR (SVG) par billet à partir de son code unique
  const billets = await Promise.all(
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
  );

  return (
    <>
      <Header />

      <main className="corps-c">
        <div className="coche" aria-hidden="true">✓</div>
        <h1>{order.statut === "paye" ? "Paiement confirmé !" : "Commande enregistrée !"}</h1>
        <p className="sous">
          {order.statut === "paye"
            ? billets.length > 1
              ? "Tes billets sont confirmés"
              : "Ton billet est confirmé"
            : billets.length > 1
              ? "Tes billets sont réservés"
              : "Ton billet est réservé"}{" "}
          · envoyé à <b>{user.email}</b>
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
          {order.statut === "paye"
            ? "Un email de confirmation t'a été envoyé."
            : "Paiement en attente — il sera confirmé dès la validation FedaPay."}
        </p>
        <Link className="suite" href="/compte">
          Voir mes billets →
        </Link>
      </main>

      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/evenements">← Tous les événements</Link>
          </span>
          <span className="fon">Mì wá dó gbè !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
