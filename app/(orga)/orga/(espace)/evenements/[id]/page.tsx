import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import Jauge from "@/components/v2/Jauge";
import DemandeVirement from "@/components/v2/orga/DemandeVirement";
import LienScan from "@/components/v2/orga/LienScan";
import Annuler from "@/components/v2/orga/Annuler";
import ListeBillets, { type BilletOrga } from "@/components/v2/orga/ListeBillets";
import ArtistesEvenement from "@/components/v2/orga/ArtistesEvenement";
import { rattachementsEvenement } from "@/lib/artistes";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { dateAnnee, dateCourte, dateHeureCourte, heureBenin, montant, nombre, pourcent } from "@/components/v2/format";
import { StatutEvt, type Statut, type StatutBillet } from "@/components/v2/statuts";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Mon événement — XwézanEvent",
};

/** Statuts qui autorisent modifier / annuler (comme l'ancien tableau de bord). */
const MODIFIABLE = new Set<Statut>(["brouillon", "en_validation", "publie"]);
const LIMITE_BILLETS = 2000;

interface EventFiche {
  id: string;
  titre: string;
  slug: string;
  date_debut: string;
  date_fin: string | null;
  date_reference_virement: string;
  heure: string | null;
  lieu: string;
  ville: string;
  statut: Statut;
  taux_commission: number;
  pays_code: string;
  lien_scan_token: string | null;
  ticket_types: { nom: string; prix: number; quantite_totale: number; quantite_vendue: number }[];
}

interface TicketLigne {
  id: string;
  statut: StatutBillet;
  created_at: string;
  utilise_le: string | null;
  ticket_types: { nom: string } | null;
  orders: { id: string; acheteur_nom: string | null; profiles: { nom: string } | null } | null;
}

/**
 * Fiche d'un événement côté organisateur (V2). NOUVELLE PAGE de la refonte
 * (preview : v2/orga/evenements/[id]) : chiffres, ventes par tarif, virement,
 * lien de scan, annulation et billets vendus, qui n'existaient en prod que
 * comme colonne du tableau de bord + export CSV.
 */
export default async function FicheEvenement({ params }: { params: { id: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/orga/evenements/${params.id}`);

  // Filtre organisateur_id = l'utilisateur : un événement d'un autre compte
  // donne 404 (jamais ses chiffres), comme les routes /api/orga/events/[id].
  const [{ data: ev }, { data: profil }] = await Promise.all([
    supabase
      .from("events")
      .select("id, titre, slug, date_debut, date_fin, date_reference_virement, heure, lieu, ville, statut, taux_commission, pays_code, lien_scan_token, ticket_types(nom, prix, quantite_totale, quantite_vendue)")
      .eq("id", params.id)
      .eq("organisateur_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
  ]);
  const e = ev as unknown as EventFiche | null;
  if (!e) notFound();

  // supabaseAdmin, APRÈS la preuve de propriété ci-dessus : nom de l'acheteur
  // (compte ou invité). Jamais son téléphone ni son e-mail (décision du 2026-09-28).
  const [{ data: ticketsData }, { data: payoutsData }, rattaches] = await Promise.all([
    supabaseAdmin
      .from("tickets")
      .select("id, statut, created_at, utilise_le, ticket_types!inner(nom, event_id), orders!inner(id, acheteur_nom, profiles(nom))")
      .eq("ticket_types.event_id", e.id)
      .order("created_at", { ascending: false })
      .limit(LIMITE_BILLETS),
    supabase.from("payouts").select("montant").eq("event_id", e.id).eq("organisateur_id", user.id).in("statut", ["demande", "traite"]),
    // Artistes à l'affiche et état des propositions (design/ARTISTES.md, lot 2).
    rattachementsEvenement(e.id, user.id),
  ]);
  const artistes = rattaches.map((r) => ({ ...r, le: r.le ? dateAnnee(r.le) : null }));

  const billets: BilletOrga[] = ((ticketsData as unknown as TicketLigne[]) ?? []).map((t) => ({
    id: t.id,
    ref: `XWZ-${(t.orders?.id ?? "").slice(0, 8).toUpperCase()}`,
    nom: t.orders?.acheteur_nom || t.orders?.profiles?.nom || "—",
    tarif: t.ticket_types?.nom ?? "—",
    statut: t.statut,
    achat: dateHeureCourte(t.created_at),
    scanne: t.statut === "utilise" && t.utilise_le ? heureBenin(t.utilise_le) : null,
  }));

  const vendus = e.ticket_types.reduce((n, t) => n + t.quantite_vendue, 0);
  const capacite = e.ticket_types.reduce((n, t) => n + t.quantite_totale, 0);
  const brut = e.ticket_types.reduce((n, t) => n + t.prix * t.quantite_vendue, 0);
  const net = Math.round(brut * (1 - e.taux_commission));
  const dejaDemande = ((payoutsData ?? []) as { montant: number }[]).reduce((n, p) => n + p.montant, 0);
  const disponible = e.statut === "annule" || e.statut === "refuse" ? 0 : Math.max(0, net - dejaDemande);
  const peutDemander = payoutDisponible(e);
  const disponibleLe = dateAnnee(dateDisponibilitePayout(e));
  const scannes = billets.filter((b) => b.statut === "utilise").length;
  const neutre = e.statut === "annule" || e.statut === "termine";
  const nom = profil?.nom_public || profil?.nom || user.email || "organisateur";

  return (
    <Coquille nav={NAV_ORGA} actif="accueil" compte={{ nom, email: user.email ?? "" }}>
      <Link href="/orga" className={s.retour}>
        <Icon name="back" /> Tableau de bord
      </Link>
      <div className={s.entete}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <StatutEvt statut={e.statut} />
          </div>
          <h1 className={s.titre}>{e.titre}</h1>
          <p className={s.sousTitre}>
            {[dateCourte(e.date_debut, e.date_fin), e.heure?.slice(0, 5), `${e.lieu}, ${e.ville}`].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className={s.barreActions}>
        {MODIFIABLE.has(e.statut) && (
          <Link href={`/orga/evenements/${e.id}/modifier`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="edit" /> Modifier
          </Link>
        )}
        {e.statut === "publie" && (
          <Link href="/scan" className={`${s.btn} ${s.btnGris}`}>
            <Icon name="qr" /> Scanner
          </Link>
        )}
        {/* Téléchargement de fichier : lien classique, pas de navigation client. */}
        <a href={`/api/orga/events/${e.id}/billets/export`} className={`${s.btn} ${s.btnGris}`}>
          <Icon name="download" /> Exporter CSV
        </a>
        {e.statut === "publie" && (
          <Link href={`/evenement/${e.slug}`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="eye" /> Page publique
          </Link>
        )}
      </div>

      <div className={s.colonnes}>
        <div>
          <section className={`${s.kpis} ${s.kpis3}`} aria-label="Chiffres de l'événement">
            <div className={`${s.kpi} ${s.kpiHeros}`}>
              <span className={s.kpiLabel}>Revenu net</span>
              <span className={s.kpiValeur}>
                {nombre(net)} <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>
                {montant(brut)} brut, {Math.round(e.taux_commission * 100)}&nbsp;% de frais
              </span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Vendus</span>
              <span className={s.kpiValeur}>{nombre(vendus)}</span>
              <span className={s.kpiContexte}>sur {nombre(capacite)} places</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Entrés</span>
              <span className={s.kpiValeur}>{nombre(scannes)}</span>
              <span className={s.kpiContexte}>{scannes > 0 ? `${pourcent(scannes, Math.max(1, vendus))} des billets` : "scan pas encore ouvert"}</span>
            </div>
          </section>

          <h2 className={s.intertitre}>Ventes par tarif</h2>
          <div className={s.panneau}>
            {vendus === 0 ? <p className={s.aide}>Aucune vente pour l&apos;instant. Les jauges se rempliront au fil des réservations.</p> : null}
            <ul className={s.tarifs} style={vendus === 0 ? { marginTop: 16 } : undefined}>
              {e.ticket_types.map((t) => (
                <li key={t.nom} className={s.tarifLigne}>
                  <div className={s.tarifTete}>
                    <b>{t.nom}</b>
                    <span className={t.quantite_vendue >= t.quantite_totale ? s.complet : undefined}>
                      {t.quantite_vendue >= t.quantite_totale ? "Complet · " : ""}
                      {t.prix === 0 ? "Gratuit" : montant(t.prix)}
                    </span>
                  </div>
                  <Jauge vendus={t.quantite_vendue} total={t.quantite_totale} neutre={neutre} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside>
          <h2 className={s.intertitre}>Gestion</h2>
          <section className={s.panneau}>
            <h2 className={s.panneauTitre}>Virement</h2>
            {disponible > 0 ? (
              <div className={s.pile}>
                <div>
                  <p className={s.grosMontant}>{montant(disponible)}</p>
                  <p className={s.note}>
                    {peutDemander ? "disponible maintenant" : `disponible le ${disponibleLe}, 3 jours après l'événement`}
                    {dejaDemande > 0 ? ` · ${montant(dejaDemande)} déjà demandés` : ""}
                  </p>
                </div>
                {peutDemander && (
                  <DemandeVirement eventId={e.id} titre={e.titre} disponible={disponible} tauxCommission={e.taux_commission} paysCode={e.pays_code} peutDemander grand />
                )}
              </div>
            ) : (
              <p className={s.aide}>
                {e.statut === "annule" ? "Événement annulé : aucun virement possible." : dejaDemande > 0 ? "Tout le solde a déjà été demandé." : "Rien à virer pour l'instant."}
              </p>
            )}
          </section>
          {(artistes.length > 0 || MODIFIABLE.has(e.statut)) && (
            <ArtistesEvenement artistes={artistes} lienModifier={MODIFIABLE.has(e.statut) ? `/orga/evenements/${e.id}/modifier` : null} />
          )}
          {e.statut === "publie" && <LienScan eventId={e.id} initial={e.lien_scan_token} />}
          {MODIFIABLE.has(e.statut) && <Annuler eventId={e.id} titre={e.titre} />}
        </aside>

        <div className={s.zoneBas}>
          <h2 className={s.intertitre}>Billets</h2>
          <ListeBillets billets={billets} />
        </div>
      </div>
    </Coquille>
  );
}
