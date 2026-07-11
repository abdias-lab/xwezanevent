import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";

export const metadata: Metadata = {
  title: "Commissions — Administration — XwézanEvent",
};

const TAUX_COMMISSION = 0.06;

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

interface OrderRow {
  event_id: string;
  total: number;
  events: { titre: string } | null;
}

interface LigneCommission {
  eventId: string;
  titre: string;
  revenu: number;
  commission: number;
  nbCommandes: number;
}

export default async function AdminCommissions() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/commissions");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || profil.role !== "admin") redirect("/");

  const { data } = await supabase
    .from("orders")
    .select("event_id, total, events(titre)")
    .eq("statut", "paye");

  const commandes = (data as unknown as OrderRow[]) ?? [];

  const parEvenement = new Map<string, LigneCommission>();
  for (const c of commandes) {
    const existant = parEvenement.get(c.event_id);
    if (existant) {
      existant.revenu += c.total;
      existant.nbCommandes += 1;
      existant.commission = Math.round(existant.revenu * TAUX_COMMISSION);
    } else {
      parEvenement.set(c.event_id, {
        eventId: c.event_id,
        titre: c.events?.titre ?? "Événement supprimé",
        revenu: c.total,
        commission: Math.round(c.total * TAUX_COMMISSION),
        nbCommandes: 1,
      });
    }
  }

  const lignes = Array.from(parEvenement.values()).sort((a, b) => b.commission - a.commission);
  const totalRevenu = lignes.reduce((s, l) => s + l.revenu, 0);
  const totalCommission = lignes.reduce((s, l) => s + l.commission, 0);

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
        <Link className="item" href="/admin/billets">🎟️ Billets</Link>
        <Link className="item actif" href="/admin/commissions">💰 Commissions</Link>
        <Link className="item" href="/admin/organisateurs">👥 Organisateurs</Link>

        <div className="bas">
          <BoutonDeconnexion />
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Commissions par événement</h1>
            <p className="sous">
              {fmt(totalCommission)} FCFA perçus au total ({TAUX_COMMISSION * 100}% de{" "}
              {fmt(totalRevenu)} FCFA de commandes payées)
            </p>
          </div>
          <Link className="btn btn-ghost" href="/admin">
            ← Vue d&apos;ensemble
          </Link>
        </div>

        <div className="tableau-panneau">
          {lignes.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3>Aucune commande payée</h3>
              <p>Les commissions apparaîtront ici dès la première vente confirmée.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Commandes payées</th>
                  <th>Revenu (commandes)</th>
                  <th>Commission (6%)</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.eventId}>
                    <td className="ev-nom">{l.titre}</td>
                    <td>{fmt(l.nbCommandes)}</td>
                    <td className="rev">{fmt(l.revenu)} F</td>
                    <td className="rev">{fmt(l.commission)} F</td>
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
