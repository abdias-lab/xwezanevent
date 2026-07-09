import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import ActionsEvenement from "@/components/admin/ActionsEvenement";
import ActionsPayout from "@/components/admin/ActionsPayout";

export const metadata: Metadata = {
  title: "Administration — XwézanEvent",
};

const MOIS_COURTS = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];

function formatDate(dateISO: string): string {
  const [a, m, j] = dateISO.split("-");
  return `${parseInt(j, 10)} ${MOIS_COURTS[parseInt(m, 10) - 1]} ${a}`;
}
function formatDateCourte(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}
function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

interface EventEnAttente {
  id: string;
  titre: string;
  date_debut: string;
  organisateur: { nom: string } | null;
  ticket_types: { prix: number; quantite_totale: number }[];
}

interface PayoutDemande {
  id: string;
  montant: number;
  moyen: string;
  created_at: string;
  organisateur: { nom: string } | null;
}

export default async function AdminPage() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, nom")
    .eq("id", user.id)
    .single();

  if (!profil || profil.role !== "admin") redirect("/");

  const debutMois = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  const [
    billetsRes,
    ordersPayesRes,
    eventsEnAttenteCountRes,
    organisateursActifsRes,
    eventsEnAttenteRes,
    payoutsDemandesRes,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .neq("statut", "annule")
      .gte("created_at", debutMois),
    supabase.from("orders").select("total").eq("statut", "paye"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_validation"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "organisateur"),
    supabase
      .from("events")
      .select(
        "id, titre, date_debut, organisateur:profiles(nom), ticket_types(prix, quantite_totale)"
      )
      .eq("statut", "en_validation")
      .order("created_at", { ascending: true }),
    supabase
      .from("payouts")
      .select("id, montant, moyen, created_at, organisateur:profiles(nom)")
      .eq("statut", "demande")
      .order("created_at", { ascending: true }),
  ]);

  const billetsVendusMois = billetsRes.count ?? 0;
  const revenuPaye = (ordersPayesRes.data ?? []).reduce(
    (s, o) => s + (o.total as number),
    0
  );
  const commissions = Math.round(revenuPaye * 0.06);
  const eventsEnAttenteCount = eventsEnAttenteCountRes.count ?? 0;
  const organisateursActifs = organisateursActifsRes.count ?? 0;

  const evenements = (eventsEnAttenteRes.data as unknown as EventEnAttente[]) ?? [];
  const payouts = (payoutsDemandesRes.data as unknown as PayoutDemande[]) ?? [];

  const nom = profil.nom || user.email || "Admin";
  const initiale = nom.charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className="lateral">
        <Link className="logo" href="/">
          <span className="mark" aria-hidden="true" />
          Xwézan<em>Event</em>
        </Link>
        <p className="role">Administration</p>

        <p className="groupe">Principal</p>
        <Link className="item actif" href="/admin">
          📊 Vue d&apos;ensemble
        </Link>

        <div className="bas">
          <div className="avatar">{initiale}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>{nom}</div>
            <BoutonDeconnexion />
          </div>
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Tableau de bord admin</h1>
            <p className="sous">XwézanEvent — Panneau de gestion</p>
          </div>
          <Link className="btn btn-ghost" href="/">
            Voir le site →
          </Link>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="libelle">Billets vendus (mois)</div>
            <div className="valeur">{fmt(billetsVendusMois)}</div>
            <div className="delta neutre">ce mois-ci</div>
          </div>
          <div className="kpi">
            <div className="libelle">Commissions perçues</div>
            <div className="valeur">
              {fmt(commissions)} <small>FCFA</small>
            </div>
            <div className="delta neutre">6% des commandes payées</div>
          </div>
          <div className="kpi">
            <div className="libelle">Événements en attente</div>
            <div className="valeur">{eventsEnAttenteCount}</div>
            <div className="delta neutre">à valider</div>
          </div>
          <div className="kpi">
            <div className="libelle">Organisateurs actifs</div>
            <div className="valeur">{organisateursActifs}</div>
            <div className="delta neutre">comptes organisateur</div>
          </div>
        </div>

        <div className="tableau-panneau" style={{ marginBottom: 24 }}>
          <h3>Événements en attente de validation</h3>

          {evenements.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3>Aucun événement en attente</h3>
              <p>Toutes les demandes de publication ont été traitées.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Organisateur</th>
                  <th>Date</th>
                  <th>Billets / Prix</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evenements.map((ev) => {
                  const capacite = ev.ticket_types.reduce(
                    (s, t) => s + t.quantite_totale,
                    0
                  );
                  const prixMin = ev.ticket_types.length
                    ? Math.min(...ev.ticket_types.map((t) => t.prix))
                    : 0;
                  return (
                    <tr key={ev.id}>
                      <td className="ev-nom">{ev.titre}</td>
                      <td>{ev.organisateur?.nom ?? "—"}</td>
                      <td>{formatDate(ev.date_debut)}</td>
                      <td>
                        {capacite > 0
                          ? `${fmt(capacite)} · dès ${fmt(prixMin)} F`
                          : "—"}
                      </td>
                      <td>
                        <span className="statut st-attente">En attente</span>
                      </td>
                      <td>
                        <ActionsEvenement eventId={ev.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="tableau-panneau">
          <h3>Virements en attente</h3>

          {payouts.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h3>Aucune demande de virement</h3>
              <p>Aucun organisateur n&apos;a de virement en attente.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Organisateur</th>
                  <th>Montant</th>
                  <th>Moyen</th>
                  <th>Demandé le</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="ev-nom">{p.organisateur?.nom ?? "—"}</td>
                    <td className="rev">{fmt(p.montant)} F</td>
                    <td>{p.moyen.toUpperCase()}</td>
                    <td>{formatDateCourte(p.created_at)}</td>
                    <td>
                      <ActionsPayout payoutId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
