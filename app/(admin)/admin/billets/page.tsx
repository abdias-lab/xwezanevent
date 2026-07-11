import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import FiltreEvenementBillets from "@/components/admin/FiltreEvenementBillets";

export const metadata: Metadata = {
  title: "Billets — Administration — XwézanEvent",
};

function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const BADGE: Record<string, { cls: string; txt: string }> = {
  valide: { cls: "st-ok", txt: "Valide" },
  utilise: { cls: "st-fini", txt: "Utilisé" },
  annule: { cls: "st-annule", txt: "Annulé" },
};

interface TicketLigne {
  id: string;
  statut: string;
  created_at: string;
  ticket_types: {
    nom: string;
    event_id: string;
    events: { id: string; titre: string } | null;
  } | null;
  orders: {
    profiles: { nom: string } | null;
  } | null;
}

const LIMITE = 500;

export default async function AdminBillets({
  searchParams,
}: {
  searchParams: { event?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/billets");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || profil.role !== "admin") redirect("/");

  const eventFiltre = searchParams.event ?? "";

  const { data: evenementsListe } = await supabase
    .from("events")
    .select("id, titre")
    .order("titre", { ascending: true });

  // ticket_types!inner : force un vrai JOIN pour que le filtre sur
  // event_id restreigne effectivement les lignes retournées (et donc que
  // la LIMITE porte sur le résultat filtré, pas sur l'ensemble global).
  let query = supabase
    .from("tickets")
    .select(
      "id, statut, created_at, ticket_types!inner(nom, event_id, events(id, titre)), orders(profiles(nom))"
    )
    .order("created_at", { ascending: false })
    .limit(LIMITE);

  if (eventFiltre) {
    query = query.eq("ticket_types.event_id", eventFiltre);
  }

  const { data } = await query;
  const billets = (data as unknown as TicketLigne[]) ?? [];

  return (
    <div className="app">
      <aside className="lateral">
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          Xwézan<em>Event</em>
        </Link>
        <p className="role">Administration</p>

        <p className="groupe">Principal</p>
        <Link className="item" href="/admin">📊 Vue d&apos;ensemble</Link>
        <Link className="item" href="/admin/evenements">🗓️ Événements</Link>
        <Link className="item actif" href="/admin/billets">🎟️ Billets</Link>
        <Link className="item" href="/admin/commissions">💰 Commissions</Link>
        <Link className="item" href="/admin/organisateurs">👥 Organisateurs</Link>
        <Link className="item" href="/admin/evenements?statut=termine">🏁 Terminés</Link>

        <div className="bas">
          <BoutonDeconnexion />
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Billets vendus</h1>
            <p className="sous">
              {billets.length}
              {billets.length === LIMITE ? "+" : ""} billet(s)
              {eventFiltre ? " pour cet événement" : ""}
            </p>
          </div>
          <Link className="btn btn-ghost" href="/admin">
            ← Vue d&apos;ensemble
          </Link>
        </div>

        <FiltreEvenementBillets
          valeur={eventFiltre}
          evenements={(evenementsListe ?? []) as { id: string; titre: string }[]}
        />

        <div className="tableau-panneau">
          {billets.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 7h16v10H4z" />
                  <path d="M4 12h16" />
                </svg>
              </div>
              <h3>Aucun billet</h3>
              <p>Aucun billet ne correspond à ce filtre.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Type de billet</th>
                  <th>Acheteur</th>
                  <th>Statut</th>
                  <th>Acheté le</th>
                </tr>
              </thead>
              <tbody>
                {billets.map((b) => {
                  const badge = BADGE[b.statut] ?? { cls: "st-fini", txt: b.statut };
                  return (
                    <tr key={b.id}>
                      <td className="ev-nom">{b.ticket_types?.events?.titre ?? "—"}</td>
                      <td>{b.ticket_types?.nom ?? "—"}</td>
                      <td>{b.orders?.profiles?.nom ?? "—"}</td>
                      <td>
                        <span className={`statut ${badge.cls}`}>{badge.txt}</span>
                      </td>
                      <td>{formatDateHeure(b.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
