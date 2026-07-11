import Header from "@/components/Header";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import AfficheEvenement from "@/components/AfficheEvenement";
import { creerClientServeur } from "@/lib/supabase-server";
import { aujourdhuiPortoNovo } from "@/lib/date";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon compte — XwézanEvent",
};

const MOIS_COURTS = [
  "jan", "fév", "mar", "avr", "mai", "juin",
  "juil", "août", "sep", "oct", "nov", "déc",
];

function formatDateHeure(dateISO: string, heure: string | null): string {
  const [annee, mois, jour] = dateISO.split("-");
  const d = `${parseInt(jour, 10)} ${MOIS_COURTS[parseInt(mois, 10) - 1]} ${annee}`;
  if (!heure) return d;
  const [h, m] = heure.split(":");
  return `${d} · ${h}h${m}`;
}

function fmtPrix(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

interface CommandeRow {
  id: string;
  total: number;
  statut: string;
  events: {
    titre: string;
    date_debut: string;
    heure: string | null;
    ville: string;
    affiche_url: string | null;
  } | null;
  tickets: { id: string; ticket_types: { nom: string } | null }[];
}

function resumeBillets(tickets: CommandeRow["tickets"]): string {
  const compte = new Map<string, number>();
  for (const t of tickets) {
    const nom = t.ticket_types?.nom ?? "Billet";
    compte.set(nom, (compte.get(nom) ?? 0) + 1);
  }
  return Array.from(compte.entries())
    .map(([nom, n]) => `${nom} × ${n}`)
    .join(", ");
}

function RangeeBillet({ cmd, passe }: { cmd: CommandeRow; passe?: boolean }) {
  const ev = cmd.events!;
  const badge =
    cmd.statut === "paye"
      ? { cls: "st-ok", txt: "✓ Payé" }
      : cmd.statut === "en_attente"
        ? { cls: "st-attente", txt: "⏳ En attente" }
        : cmd.statut === "rembourse"
          ? { cls: "st-fini", txt: "Remboursé" }
          : { cls: "st-fini", txt: "Échoué" };

  return (
    <div className={`rangee-billet${passe ? " passe" : ""}`}>
      <AfficheEvenement
        className="vignette"
        src={ev.affiche_url}
        alt={ev.titre}
        width={64}
        height={64}
      />
      <div>
        <h3>{ev.titre}</h3>
        <p className="meta">
          📅 {formatDateHeure(ev.date_debut, ev.heure)} &nbsp;|&nbsp; 📍{" "}
          {ev.ville} &nbsp;|&nbsp; {resumeBillets(cmd.tickets)}
        </p>
        {!passe && (
          <div className="actions">
            <Link className="btn btn-or" href={`/confirmation?order=${cmd.id}`}>
              📱 Voir mes billets
            </Link>
          </div>
        )}
      </div>
      <div className="cote">
        <span className="prix-b">{cmd.total > 0 ? fmtPrix(cmd.total) : "Gratuit"}</span>
        <span className={`statut ${passe ? "st-fini" : badge.cls}`}>
          {passe ? "Terminé" : badge.txt}
        </span>
      </div>
    </div>
  );
}

export default async function Compte() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");

  const { data } = await supabase
    .from("orders")
    .select(
      "id, total, statut, events(titre, date_debut, heure, ville, affiche_url), tickets(id, ticket_types(nom))"
    )
    .order("created_at", { ascending: false });

  const commandes = ((data as unknown as CommandeRow[]) ?? []).filter(
    (c) => c.events !== null
  );

  const aujourdhui = aujourdhuiPortoNovo();
  const aVenir = commandes.filter((c) => c.events!.date_debut >= aujourdhui);
  const passes = commandes.filter((c) => c.events!.date_debut < aujourdhui);

  const nom = (user.user_metadata?.nom as string | undefined) ?? user.email ?? "";
  const initiale = nom.charAt(0).toUpperCase();

  return (
    <>
      <Header />

      <main className="corps-cp">
        <aside className="menu-cp" aria-label="Menu du compte">
          <div className="profil">
            <div className="avatar">{initiale}</div>
            <div className="qui">
              <div className="n">{nom}</div>
              <div className="e">{user.email}</div>
            </div>
          </div>
          <Link href="/compte" className="actif">🎫 Mes billets</Link>
          <Link href="/evenements">🔎 Découvrir</Link>
          <Link href="/creer">➕ Publier un événement</Link>
          <BoutonDeconnexion />
        </aside>

        <div className="contenu-cp">
          <h1>Mes billets</h1>
          <p className="sous">Retrouve tous tes billets et e-tickets ici</p>

          {commandes.length === 0 ? (
            <div className="etat-vide">
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2 2 2 0 0 1-2-2H8a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
                </svg>
              </div>
              <h3>Aucun billet pour l&apos;instant</h3>
              <p>Découvre les événements et réserve ta première place.</p>
              <Link className="btn btn-or" href="/evenements">
                Explorer les événements
              </Link>
            </div>
          ) : (
            <>
              {aVenir.length > 0 && (
                <>
                  <p className="titre-groupe">À venir ({aVenir.length})</p>
                  {aVenir.map((c) => (
                    <RangeeBillet key={c.id} cmd={c} />
                  ))}
                </>
              )}
              {passes.length > 0 && (
                <>
                  <p className="titre-groupe">Passés ({passes.length})</p>
                  {passes.map((c) => (
                    <RangeeBillet key={c.id} cmd={c} passe />
                  ))}
                </>
              )}
            </>
          )}
        </div>
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
