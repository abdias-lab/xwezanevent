import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";

export const metadata: Metadata = {
  title: "Organisateurs — Administration — XwézanEvent",
};

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

interface EventAgrege {
  organisateur_id: string;
  ticket_types: { prix: number; quantite_vendue: number }[];
}

interface OrganisateurLigne {
  id: string;
  nom: string;
  nbEvenements: number;
  billetsVendus: number;
  revenu: number;
}

export default async function AdminOrganisateurs() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/organisateurs");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || profil.role !== "admin") redirect("/");

  const [{ data: organisateursData }, { data: eventsData }] = await Promise.all([
    supabase.from("profiles").select("id, nom").eq("role", "organisateur"),
    supabase.from("events").select("organisateur_id, ticket_types(prix, quantite_vendue)"),
  ]);

  const evenements = (eventsData as unknown as EventAgrege[]) ?? [];

  const parOrganisateur = new Map<string, { nbEvenements: number; billetsVendus: number; revenu: number }>();
  for (const ev of evenements) {
    const agg = parOrganisateur.get(ev.organisateur_id) ?? {
      nbEvenements: 0,
      billetsVendus: 0,
      revenu: 0,
    };
    agg.nbEvenements += 1;
    for (const tt of ev.ticket_types) {
      agg.billetsVendus += tt.quantite_vendue;
      agg.revenu += tt.prix * tt.quantite_vendue;
    }
    parOrganisateur.set(ev.organisateur_id, agg);
  }

  const lignes: OrganisateurLigne[] = ((organisateursData ?? []) as { id: string; nom: string }[])
    .map((o) => {
      const agg = parOrganisateur.get(o.id) ?? { nbEvenements: 0, billetsVendus: 0, revenu: 0 };
      return { id: o.id, nom: o.nom, ...agg };
    })
    .sort((a, b) => b.revenu - a.revenu);

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
        <Link className="item" href="/admin/commissions">💰 Commissions</Link>
        <Link className="item actif" href="/admin/organisateurs">👥 Organisateurs</Link>

        <div className="bas">
          <BoutonDeconnexion />
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Organisateurs</h1>
            <p className="sous">{lignes.length} compte(s) organisateur</p>
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
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              </div>
              <h3>Aucun organisateur</h3>
              <p>Les comptes organisateur apparaîtront ici dès leur première publication.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Organisateur</th>
                  <th>Événements</th>
                  <th>Billets vendus</th>
                  <th>Revenu généré</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <tr key={l.id}>
                    <td className="ev-nom">{l.nom}</td>
                    <td>{fmt(l.nbEvenements)}</td>
                    <td>{fmt(l.billetsVendus)}</td>
                    <td className="rev">{fmt(l.revenu)} F</td>
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
