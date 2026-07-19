import Link from "next/link";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import ActionsEvenementOrga from "@/components/orga/ActionsEvenementOrga";
import DemandeVirement from "@/components/orga/DemandeVirement";
import Logo from "@/components/Logo";
import { creerClientServeur } from "@/lib/supabase-server";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace organisateur — XwézanEvent",
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
  return n.toLocaleString("fr-FR").replace(/\s/g, " ");
}

interface EventOrga {
  id: string;
  titre: string;
  slug: string;
  date_debut: string;
  statut: string;
  ticket_types: { prix: number; quantite_totale: number; quantite_vendue: number }[];
}

const BADGE: Record<string, { cls: string; txt: string }> = {
  publie: { cls: "st-ok", txt: "En vente" },
  en_validation: { cls: "st-attente", txt: "En validation" },
  brouillon: { cls: "st-fini", txt: "Brouillon" },
  termine: { cls: "st-fini", txt: "Terminé" },
  refuse: { cls: "st-fini", txt: "Refusé" },
  annule: { cls: "st-annule", txt: "Annulé" },
};

const STATUTS_ANNULABLES = new Set(["brouillon", "en_validation", "publie"]);

export default async function Orga() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga");

  const [{ data }, { data: payoutsData }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, titre, slug, date_debut, statut, ticket_types(prix, quantite_totale, quantite_vendue)"
      )
      .eq("organisateur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase
      .from("payouts")
      .select("event_id, montant, statut")
      .eq("organisateur_id", user.id)
      .in("statut", ["demande", "traite"]),
  ]);

  const events = (data as unknown as EventOrga[]) ?? [];

  const dejaDemandeParEvenement = new Map<string, number>();
  for (const p of (payoutsData ?? []) as { event_id: string; montant: number }[]) {
    dejaDemandeParEvenement.set(p.event_id, (dejaDemandeParEvenement.get(p.event_id) ?? 0) + p.montant);
  }

  const STATUTS_SANS_VIREMENT = new Set(["annule", "refuse"]);

  // Agrégats par événement + totaux
  const lignes = events.map((ev) => {
    const vendus = ev.ticket_types.reduce((s, t) => s + t.quantite_vendue, 0);
    const capacite = ev.ticket_types.reduce((s, t) => s + t.quantite_totale, 0);
    const revenu = ev.ticket_types.reduce((s, t) => s + t.prix * t.quantite_vendue, 0);
    const revenuNetEvenement = Math.round(revenu * 0.94);
    const dejaDemande = dejaDemandeParEvenement.get(ev.id) ?? 0;
    const disponible = STATUTS_SANS_VIREMENT.has(ev.statut)
      ? 0
      : Math.max(0, revenuNetEvenement - dejaDemande);
    const peutDemander = payoutDisponible(ev);
    const disponibleLe = formatDate(dateDisponibilitePayout(ev));
    return { ev, vendus, capacite, revenu, disponible, peutDemander, disponibleLe };
  });

  const nbPublies = events.filter((e) => e.statut === "publie").length;
  const totalVendus = lignes.reduce((s, l) => s + l.vendus, 0);
  const totalCapacite = lignes.reduce((s, l) => s + l.capacite, 0);
  const revenuBrut = lignes.reduce((s, l) => s + l.revenu, 0);
  const revenuNet = Math.round(revenuBrut * 0.94);

  const nom = (user.user_metadata?.nom as string | undefined) ?? user.email ?? "organisateur";
  const initiale = nom.charAt(0).toUpperCase();

  return (
    <div className="app">
      <aside className="lateral">
        <Logo />
        <p className="role">Organisateur</p>

        <p className="groupe">Principal</p>
        <Link className="item actif" href="/orga">📊 Vue d&apos;ensemble</Link>
        <Link className="item" href="/evenements">🎟️ Le catalogue</Link>
        <Link className="btn btn-or" href="/creer" style={{ marginTop: 22 }}>
          + Créer un événement
        </Link>
        <Link className="item" href="/scan" style={{ marginTop: 8 }}>📷 Scanner les billets</Link>
        <Link className="item" href="/orga/reversements" style={{ marginTop: 8 }}>🏦 Mes reversements</Link>

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
            <h1>Bonjour, {nom} 👋</h1>
            <p className="sous">Voici comment se portent tes événements</p>
          </div>
          <Link className="btn btn-ghost" href="/">
            Voir le site →
          </Link>
        </div>

        <div className="kpis">
          <div className="kpi">
            <div className="libelle">Revenu net</div>
            <div className="valeur">
              {fmt(revenuNet)} <small>FCFA</small>
            </div>
            <div className="delta neutre">après 6% de frais</div>
          </div>
          <div className="kpi">
            <div className="libelle">Billets vendus</div>
            <div className="valeur">{fmt(totalVendus)}</div>
            <div className="delta neutre">
              {totalCapacite > 0 ? `sur ${fmt(totalCapacite)} places` : "aucune place en vente"}
            </div>
          </div>
          <div className="kpi">
            <div className="libelle">Événements publiés</div>
            <div className="valeur">{nbPublies}</div>
            <div className="delta neutre">{events.length} au total</div>
          </div>
          <div className="kpi">
            <div className="libelle">Revenu brut</div>
            <div className="valeur">
              {fmt(revenuBrut)} <small>FCFA</small>
            </div>
            <div className="delta neutre">avant frais</div>
          </div>
        </div>

        <div className="tableau-panneau">
          <h3>
            Mes événements
            <Link href="/creer">+ Nouveau →</Link>
          </h3>

          {lignes.length === 0 ? (
            <div className="etat-vide" style={{ margin: "10px auto 4px" }}>
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
                </svg>
              </div>
              <h3>Aucun événement</h3>
              <p>Publie ton premier événement pour commencer à vendre des billets.</p>
              <Link className="btn btn-or" href="/creer">Créer un événement</Link>
            </div>
          ) : (
            <table className="donnees">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Date</th>
                  <th>Ventes</th>
                  <th>Revenu</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ ev, vendus, capacite, revenu, disponible, peutDemander, disponibleLe }) => {
                  const badge = BADGE[ev.statut] ?? { cls: "st-fini", txt: ev.statut };
                  return (
                    <tr key={ev.id}>
                      <td className="ev-nom">
                        {ev.statut === "publie" ? (
                          <Link href={`/evenement/${ev.slug}`}>{ev.titre}</Link>
                        ) : (
                          ev.titre
                        )}
                      </td>
                      <td>{formatDate(ev.date_debut)}</td>
                      <td>{capacite > 0 ? `${fmt(vendus)} / ${fmt(capacite)}` : "—"}</td>
                      <td className="rev">{revenu > 0 ? `${fmt(revenu)} F` : "—"}</td>
                      <td>
                        <span className={`statut ${badge.cls}`}>{badge.txt}</span>
                      </td>
                      <td>
                        <div className="act">
                          {disponible > 0 && (
                            <DemandeVirement
                              eventId={ev.id}
                              titre={ev.titre}
                              disponible={disponible}
                              peutDemander={peutDemander}
                              disponibleLe={disponibleLe}
                            />
                          )}
                          {STATUTS_ANNULABLES.has(ev.statut) && (
                            <ActionsEvenementOrga eventId={ev.id} titre={ev.titre} />
                          )}
                        </div>
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
