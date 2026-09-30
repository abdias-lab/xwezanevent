import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur } from "@/lib/email";
import { commandesCorrespondantes } from "@/lib/billets-admin";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateHeure, montant } from "@/components/v2/format";
import { StatutBilletV2, type StatutBillet } from "@/components/v2/statuts";
import { formaterNumero } from "@/components/v2/admin/moyens";
import Remboursements, { type CommandeARembourser } from "@/components/v2/admin/Remboursements";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Billets — Administration — XwézanEvent",
};

const FILTRES = [
  { cle: "", libelle: "Tous" },
  { cle: "valide", libelle: "Valides" },
  { cle: "utilise", libelle: "Utilisés" },
  { cle: "annule", libelle: "Annulés" },
  { cle: "rembourser", libelle: "À rembourser" },
] as const;

const COLS = { "--cols": "minmax(0, 1.6fr) minmax(0, 1.5fr) minmax(0, 1.6fr) 110px 120px" } as CSSProperties;
const LIMITE = 500; // comme l'ancienne page de prod

type Acheteur = { user_id: string | null; acheteur_nom: string | null; acheteur_email: string | null; acheteur_telephone: string | null; profiles: { nom: string; telephone: string | null } | null };

interface TicketLigne {
  id: string;
  statut: StatutBillet;
  created_at: string;
  ticket_types: { nom: string; prix: number; event_id: string; events: { titre: string } | null } | null;
  orders: (Acheteur & { id: string; statut: string }) | null;
}

interface CommandeAnnulee extends Acheteur {
  id: string;
  total: number;
  events: { titre: string } | null;
  tickets: { count: number }[];
}

type BilletVue = { id: string; ref: string; nom: string; tel: string; email: string; invite: boolean; statut: StatutBillet; evenement: string; tarif: string; prix: number; rembourse: boolean; acheteLe: string };

/**
 * Billets et remboursements (V2). Corrige l'affichage des acheteurs invités
 * (bug #6 : identité lue aussi dans orders.acheteur_*) ; l'onglet « À
 * rembourser » (bug #7) est en lecture seule jusqu'au chantier annulation.
 * Filtres en GET : fonctionnent sans JavaScript.
 */
export default async function AdminBillets({ searchParams }: { searchParams: { event?: string; statut?: string; q?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/billets");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const evt = searchParams.event ?? "";
  const statut = FILTRES.find((f) => f.cle === searchParams.statut) ?? FILTRES[0];
  const q = (searchParams.q ?? "").trim();
  const lien = (p: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries({ event: evt, statut: statut.cle, q, ...p }).filter(([, v]) => v) as [string, string][]);
    return `/admin/billets${u.toString() ? `?${u}` : ""}`;
  };

  // supabaseAdmin : le téléphone de l'acheteur (nécessaire aux remboursements
  // Mobile Money) n'est plus lisible via le rôle `authenticated` (migration
  // 20260717140000) ; le rôle admin est vérifié ci-dessus via la session.
  const commandes = q ? await commandesCorrespondantes(q) : null;
  const aucuneCommande = commandes !== null && commandes.length === 0;

  const SELECT_BILLET =
    "id, statut, created_at, ticket_types!inner(nom, prix, event_id, events(titre)), orders!inner(id, statut, user_id, acheteur_nom, acheteur_email, acheteur_telephone, profiles(nom, telephone))";
  // ticket_types!inner : le filtre sur event_id restreint vraiment les lignes (et la LIMITE porte sur le résultat filtré).
  const requeteBillets = (sel: string, opts?: { count: "exact"; head: true }) => {
    let r = supabaseAdmin.from("tickets").select(sel, opts);
    if (evt) r = r.eq("ticket_types.event_id", evt);
    if (commandes) r = r.in("order_id", commandes);
    return r;
  };
  const compterBillets = async (st: string) => {
    if (aucuneCommande) return 0;
    let r = requeteBillets("id, ticket_types!inner(event_id)", { count: "exact", head: true });
    if (st) r = r.eq("statut", st);
    return (await r).count ?? 0;
  };

  let requeteRemb = supabaseAdmin
    .from("orders")
    .select("id, total, user_id, acheteur_nom, acheteur_email, acheteur_telephone, profiles(nom, telephone), events!inner(titre, statut), tickets(count)")
    .eq("statut", "paye")
    .eq("events.statut", "annule")
    .order("created_at", { ascending: true });
  if (evt) requeteRemb = requeteRemb.eq("event_id", evt);
  if (commandes) requeteRemb = requeteRemb.in("id", commandes);

  let requeteListe = requeteBillets(SELECT_BILLET).order("created_at", { ascending: false }).limit(LIMITE);
  if (statut.cle && statut.cle !== "rembourser") requeteListe = requeteListe.eq("statut", statut.cle);

  const [nTous, nValide, nUtilise, nAnnule, rembRes, listeRes, vendusRes] = await Promise.all([
    compterBillets(""),
    compterBillets("valide"),
    compterBillets("utilise"),
    compterBillets("annule"),
    aucuneCommande ? Promise.resolve({ data: [] }) : requeteRemb,
    aucuneCommande || statut.cle === "rembourser" ? Promise.resolve({ data: [] }) : requeteListe,
    supabaseAdmin.from("ticket_types").select("event_id, events(titre)").gt("quantite_vendue", 0),
  ]);

  const billets = ((listeRes.data ?? []) as unknown as TicketLigne[]).filter((b) => b.orders);
  const annulees = (rembRes.data ?? []) as unknown as CommandeAnnulee[];

  // E-mail d'un acheteur avec compte : dans auth.users (lib/email.ts), une requête par compte distinct.
  const userIds = Array.from(new Set([...billets.map((b) => b.orders!.user_id), ...annulees.map((c) => c.user_id)].filter((x): x is string => !!x)));
  const emails = new Map(await Promise.all(userIds.map(async (id) => [id, (await emailUtilisateur(id)) ?? "—"] as const)));
  const identite = (a: Acheteur) => ({
    nom: a.acheteur_nom || a.profiles?.nom || "—",
    tel: formaterNumero((a.acheteur_telephone || a.profiles?.telephone || "—").replace(/\s/g, "")),
    email: a.acheteur_email || (a.user_id ? emails.get(a.user_id) : null) || "—",
    invite: !a.user_id,
  });

  const liste: BilletVue[] = billets.map((b) => ({
    id: b.id,
    ref: `XWZ-${b.orders!.id.slice(0, 8).toUpperCase()}`,
    ...identite(b.orders!),
    statut: b.statut,
    evenement: b.ticket_types?.events?.titre ?? "—",
    tarif: b.ticket_types?.nom ?? "—",
    prix: b.ticket_types?.prix ?? 0,
    rembourse: b.orders!.statut === "rembourse",
    acheteLe: b.created_at,
  }));
  const aRembourser: CommandeARembourser[] = annulees.map((c) => ({
    commande: c.id,
    ...identite(c),
    evenement: c.events?.titre ?? "—",
    billets: c.tickets[0]?.count ?? 0,
    total: c.total,
  }));

  const nombres: Record<string, number> = { "": nTous, valide: nValide, utilise: nUtilise, annule: nAnnule, rembourser: aRembourser.length };
  const evenementsVendus = Array.from(
    new Map(((vendusRes.data ?? []) as unknown as { event_id: string; events: { titre: string } | null }[]).map((t) => [t.event_id, t.events?.titre ?? "—"]))
  ).sort((a, b) => a[1].localeCompare(b[1], "fr"));

  return (
    <Coquille nav={NAV_ADMIN} actif="billets" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Billets et remboursements</h1>
          <p className={s.sousTitre}>Retrouver un acheteur, et rembourser ceux des événements annulés.</p>
        </div>
      </div>

      <form action="/admin/billets" method="get" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div className={s.recherche} role="search">
          <Icon name="search" size={20} />
          <input type="search" name="q" defaultValue={q} placeholder="Nom, téléphone, e-mail ou référence" aria-label="Rechercher un billet" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className={s.champ} style={{ flex: 1 }}>
            <label htmlFor="event" className={s.srOnly}>
              Événement
            </label>
            <select id="event" name="event" defaultValue={evt}>
              <option value="">Tous les événements</option>
              {evenementsVendus.map(([id, titre]) => (
                <option key={id} value={id}>
                  {titre}
                </option>
              ))}
            </select>
          </div>
          {statut.cle && <input type="hidden" name="statut" value={statut.cle} />}
          <button type="submit" className={`${s.btn} ${s.btnGris}`} style={{ height: 48 }}>
            Filtrer
          </button>
        </div>
      </form>

      <div className={s.puces} role="group" aria-label="Filtrer par statut" style={{ marginBottom: 16 }}>
        {FILTRES.map((f) => (
          <Link key={f.cle} href={lien({ statut: f.cle })} className={`${s.puce} ${f.cle === statut.cle ? s.puceOn : ""}`} aria-current={f.cle === statut.cle ? "true" : undefined}>
            {f.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{nombres[f.cle]}</span>
          </Link>
        ))}
      </div>

      {evt && statut.cle !== "rembourser" && (
        <p style={{ marginBottom: 12 }}>
          {/* Route de téléchargement (fichier CSV) : lien classique, pas de navigation client. */}
          <a href={`/api/admin/events/${evt}/billets/export`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="download" /> Exporter en CSV
          </a>
        </p>
      )}

      {statut.cle === "rembourser" ? (
        aRembourser.length === 0 ? (
          <div className={s.vide}>
            <Icon name="check" size={32} />
            <p className={s.videTitre}>Aucun remboursement en attente</p>
            <p className={s.videTexte}>Les commandes payées d&apos;un événement annulé apparaissent ici jusqu&apos;à leur remboursement.</p>
          </div>
        ) : (
          <Remboursements commandes={aRembourser} />
        )
      ) : liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="ticket" size={32} />
          <p className={s.videTitre}>{q ? "Aucun résultat" : "Aucun billet"}</p>
          <p className={s.videTexte}>{q ? `Aucun billet ne correspond à « ${q} ».` : "Les billets apparaîtront ici dès la première vente."}</p>
        </div>
      ) : (
        <>
          <ul className={s.liste}>
            <li className={s.enteteListe} style={COLS} aria-hidden="true">
              <span>Acheteur</span>
              <span>Contact</span>
              <span>Événement</span>
              <span>Statut</span>
              <span>Acheté le</span>
            </li>
            {liste.map((b) => (
              <Ligne key={b.id} b={b} />
            ))}
          </ul>
          <p className={s.note} style={{ marginTop: 8 }}>
            {liste.length} billet{liste.length > 1 ? "s" : ""} affiché{liste.length > 1 ? "s" : ""}, les plus récents d&apos;abord ({LIMITE} au maximum).
          </p>
        </>
      )}
    </Coquille>
  );
}

function Ligne({ b }: { b: BilletVue }) {
  return (
    <li className={s.carte} style={{ ...COLS, gap: 8 }}>
      <div className={s.carteHaut}>
        <div>
          <p className={s.carteTitre} style={{ fontSize: 15 }}>
            {b.nom}
            {b.invite && (
              <span className={`${s.statut} ${s.stNeutre}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                Invité
              </span>
            )}
          </p>
          <p className={`${s.carteMeta} ${s.chiffre}`}>{b.ref}</p>
        </div>
        <span className={s.masqueDesktop}>
          <StatutBilletV2 statut={b.statut} />
        </span>
      </div>
      <dl className={s.paires}>
        <dt>Contact</dt>
        <dd>
          <span className={s.chiffre}>{b.tel}</span>
          <span className={s.note} style={{ display: "block" }}>
            {b.email}
          </span>
        </dd>
        <dt>Événement</dt>
        <dd>
          {b.evenement}
          <span className={s.note} style={{ display: "block" }}>
            {b.tarif} · {b.prix ? montant(b.prix) : "gratuit"}
            {b.rembourse ? " · remboursé" : ""}
          </span>
        </dd>
        <dt>Acheté le</dt>
        <dd className={s.masqueDesktop}>{dateHeure(b.acheteLe)}</dd>
      </dl>
      <span className={s.cellule}>
        <StatutBilletV2 statut={b.statut} />
      </span>
      <span className={s.cellule} style={{ fontSize: 13 }}>
        {dateHeure(b.acheteLe)}
      </span>
    </li>
  );
}
