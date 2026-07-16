import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import ActionsEvenement from "@/components/admin/ActionsEvenement";
import ActionsEvenementGestion from "@/components/admin/ActionsEvenementGestion";
import FiltreStatutEvenements from "@/components/admin/FiltreStatutEvenements";
import ToggleMiseEnAvant from "@/components/admin/ToggleMiseEnAvant";
import AfficheEvenement from "@/components/AfficheEvenement";
import Logo from "@/components/Logo";
import { aujourdhuiPortoNovo } from "@/lib/date";
import { LIMITE_TICKER } from "@/lib/events";

export const metadata: Metadata = {
  title: "Événements — Administration — XwézanEvent",
};

const MOIS_COURTS = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];
function formatDate(dateISO: string): string {
  const [a, m, j] = dateISO.split("-");
  return `${parseInt(j, 10)} ${MOIS_COURTS[parseInt(m, 10) - 1]} ${a}`;
}
function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

const BADGE: Record<string, { cls: string; txt: string }> = {
  publie: { cls: "st-ok", txt: "Publié" },
  en_validation: { cls: "st-attente", txt: "En validation" },
  brouillon: { cls: "st-fini", txt: "Brouillon" },
  termine: { cls: "st-fini", txt: "Terminé" },
  refuse: { cls: "st-fini", txt: "Refusé" },
  annule: { cls: "st-annule", txt: "Annulé" },
};

interface EventLigne {
  id: string;
  titre: string;
  slug: string;
  date_debut: string;
  statut: string;
  affiche_url: string | null;
  mis_en_avant: boolean;
  ordre_affiche: number | null;
  organisateur: { nom: string } | null;
  ticket_types: { prix: number; quantite_totale: number; quantite_vendue: number }[];
}

export default async function AdminEvenements({
  searchParams,
}: {
  searchParams: { statut?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/evenements");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || profil.role !== "admin") redirect("/");

  // Filet de sécurité si pg_cron n'est pas disponible/activé sur ce projet.
  await supabaseAdmin.rpc("cloturer_evenements_passes");

  const statutFiltre = searchParams.statut ?? "";
  const aujourdhui = aujourdhuiPortoNovo();

  let query = supabase
    .from("events")
    .select(
      "id, titre, slug, date_debut, statut, affiche_url, mis_en_avant, ordre_affiche, organisateur:profiles(nom), ticket_types(prix, quantite_totale, quantite_vendue)"
    )
    .order("created_at", { ascending: false });
  if (statutFiltre) query = query.eq("statut", statutFiltre);

  const [{ data }, { count: enAvantEligibles }] = await Promise.all([
    query,
    supabaseAdmin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("statut", "publie")
      .eq("mis_en_avant", true)
      .gte("date_debut", aujourdhui),
  ]);
  const evenements = (data as unknown as EventLigne[]) ?? [];
  const totalEnAvant = enAvantEligibles ?? 0;
  const badgeTicker =
    totalEnAvant === 0
      ? "Aucun événement en avant — repli sur les prochaines dates"
      : totalEnAvant > LIMITE_TICKER
        ? `${LIMITE_TICKER} en avant dans le ticker (${totalEnAvant} cochés, limite atteinte)`
        : `${totalEnAvant} événement(s) en avant dans le ticker`;

  return (
    <div className="app">
      <aside className="lateral">
        <Logo />
        <p className="role">Administration</p>

        <p className="groupe">Principal</p>
        <Link className="item" href="/admin">📊 Vue d&apos;ensemble</Link>
        <Link className="item actif" href="/admin/evenements">🗓️ Événements</Link>
        <Link className="item" href="/admin/billets">🎟️ Billets</Link>
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
            <h1>Tous les événements</h1>
            <p className="sous">{evenements.length} événement(s)</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className={`statut ${totalEnAvant > 0 ? "st-avant" : "st-fini"}`}>
              {badgeTicker}
            </span>
            <Link className="btn btn-ghost" href="/admin">
              ← Vue d&apos;ensemble
            </Link>
          </div>
        </div>

        <FiltreStatutEvenements valeur={statutFiltre} />

        <div className="tableau-panneau">
          {evenements.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <h3>Aucun événement</h3>
              <p>Aucun événement ne correspond à ce filtre.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Affiche</th>
                  <th>Événement</th>
                  <th>Organisateur</th>
                  <th>Date</th>
                  <th>Billets / Prix</th>
                  <th>Statut</th>
                  <th>Ticker</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {evenements.map((ev) => {
                  const capacite = ev.ticket_types.reduce((s, t) => s + t.quantite_totale, 0);
                  const vendus = ev.ticket_types.reduce((s, t) => s + t.quantite_vendue, 0);
                  const prixMin = ev.ticket_types.length
                    ? Math.min(...ev.ticket_types.map((t) => t.prix))
                    : 0;
                  const badge = BADGE[ev.statut] ?? { cls: "st-fini", txt: ev.statut };
                  return (
                    <tr key={ev.id}>
                      <td>
                        <AfficheEvenement
                          className="ev-affiche"
                          src={ev.affiche_url}
                          alt={ev.titre}
                          width={44}
                          height={44}
                        />
                      </td>
                      <td className="ev-nom">{ev.titre}</td>
                      <td>{ev.organisateur?.nom ?? "—"}</td>
                      <td>{formatDate(ev.date_debut)}</td>
                      <td>
                        {capacite > 0
                          ? `${fmt(vendus)}/${fmt(capacite)} · dès ${fmt(prixMin)} F`
                          : "—"}
                      </td>
                      <td>
                        <span className={`statut ${badge.cls}`}>{badge.txt}</span>
                      </td>
                      <td>
                        <ToggleMiseEnAvant
                          eventId={ev.id}
                          misEnAvant={ev.mis_en_avant}
                          ordreAffiche={ev.ordre_affiche}
                          eligible={ev.statut === "publie" && ev.date_debut >= aujourdhui}
                        />
                      </td>
                      <td>
                        {ev.statut === "en_validation" ? (
                          <ActionsEvenement eventId={ev.id} titre={ev.titre} />
                        ) : (
                          <ActionsEvenementGestion
                            eventId={ev.id}
                            titre={ev.titre}
                            statut={ev.statut}
                          />
                        )}
                      </td>
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
