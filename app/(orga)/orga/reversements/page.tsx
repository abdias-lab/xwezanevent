import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Mes reversements — XwézanEvent",
};

function fmt(n: number): string {
  return n.toLocaleString("fr-FR");
}

function formaterNumero(n: string): string {
  return /^\d{10}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : n;
}

function formatDateHeure(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  );
}

const BADGE: Record<string, { cls: string; txt: string }> = {
  demande: { cls: "st-attente", txt: "En attente" },
  traite: { cls: "st-ok", txt: "Traité" },
  bloque: { cls: "st-annule", txt: "Gelé" },
};

interface PayoutLigne {
  id: string;
  montant: number;
  moyen: string;
  numero_destination: string;
  statut: string;
  created_at: string;
  traite_le: string | null;
  events: { titre: string } | null;
}

export default async function OrgaReversements() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/reversements");

  // Client de session (pas supabaseAdmin) : la policy RLS "Organisateurs
  // can read their own payouts" (USING organisateur_id = auth.uid())
  // suffit — pas de restriction de colonne sur numero_destination pour le
  // rôle authenticated (contrairement à profiles.telephone), donc pas
  // besoin de service_role ici.
  const { data } = await supabase
    .from("payouts")
    .select("id, montant, moyen, numero_destination, statut, created_at, traite_le, events(titre)")
    .eq("organisateur_id", user.id)
    .order("created_at", { ascending: false });

  const payouts = (data as unknown as PayoutLigne[]) ?? [];
  const totalRecu = payouts
    .filter((p) => p.statut === "traite")
    .reduce((s, p) => s + p.montant, 0);

  return (
    <div className="app">
      <aside className="lateral">
        <Logo />
        <p className="role">Organisateur</p>

        <p className="groupe">Principal</p>
        <Link className="item" href="/orga">📊 Vue d&apos;ensemble</Link>
        <Link className="item" href="/evenements">🎟️ Le catalogue</Link>
        <Link className="btn btn-or" href="/creer" style={{ marginTop: 22 }}>
          + Créer un événement
        </Link>
        <Link className="item" href="/scan" style={{ marginTop: 8 }}>📷 Scanner les billets</Link>
        <Link className="item actif" href="/orga/reversements" style={{ marginTop: 8 }}>🏦 Mes reversements</Link>

        <div className="bas">
          <BoutonDeconnexion />
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Mes reversements</h1>
            <p className="sous">
              {fmt(totalRecu)} FCFA reçus au total
              {payouts.length > 0 ? ` · ${fmt(payouts.length)} demande(s)` : ""}
            </p>
          </div>
          <Link className="btn btn-ghost" href="/orga">
            ← Vue d&apos;ensemble
          </Link>
        </div>

        <div className="tableau-panneau">
          {payouts.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M3 10h18M6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
                </svg>
              </div>
              <h3>Aucun reversement</h3>
              <p>Tes demandes de virement apparaîtront ici dès que tu en fais une.</p>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Montant</th>
                  <th>Moyen</th>
                  <th>Numéro de destination</th>
                  <th>Demandé le</th>
                  <th>Traité le</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const badge = BADGE[p.statut] ?? { cls: "st-fini", txt: p.statut };
                  return (
                    <tr key={p.id}>
                      <td className="ev-nom">{p.events?.titre ?? "—"}</td>
                      <td className="rev">{fmt(p.montant)} F</td>
                      <td>{p.moyen.toUpperCase()}</td>
                      <td style={{ fontFamily: "var(--space)", fontWeight: 700 }}>
                        {formaterNumero(p.numero_destination)}
                      </td>
                      <td>{formatDateHeure(p.created_at)}</td>
                      <td>{p.traite_le ? formatDateHeure(p.traite_le) : "—"}</td>
                      <td>
                        <span className={`statut ${badge.cls}`}>{badge.txt}</span>
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
