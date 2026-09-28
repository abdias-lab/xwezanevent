import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { payoutDisponible } from "@/lib/payouts";
import { TELEPHONE_PAR_PAYS } from "@/lib/telephone";
import BoutonVerse from "@/components/v2/admin/BoutonVerse";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateAnnee, dateCourte, depuis, montant, nombre } from "@/components/v2/format";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Administration — XwézanEvent",
};

interface EventEnAttente {
  id: string;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  ville: string;
  soumis_le: string;
  organisateur: { nom: string; nom_public: string | null } | null;
}

interface PayoutDemande {
  id: string;
  montant: number;
  moyen: string;
  numero_destination: string;
  statut: string;
  created_at: string;
  organisateur: { nom: string; telephone: string | null } | null;
  events: { titre: string; date_debut: string; date_fin: string | null; date_reference_virement: string } | null;
}

/** "mtn" → "MTN Mobile Money" (lib/telephone.ts) ; code inconnu affiché tel quel. */
function nomMoyen(code: string): string {
  for (const pays of Object.values(TELEPHONE_PAR_PAYS)) {
    const op = pays.operateurs.find((o) => o.code === code);
    if (op) return op.nom;
  }
  return code.toUpperCase();
}

/** "0190123456" → "01 90 12 34 56", pour l'affichage admin. */
function formaterNumero(n: string): string {
  return /^\d{10}$/.test(n) ? n.replace(/(\d{2})(?=\d)/g, "$1 ").trim() : n;
}

/**
 * Tableau de bord admin (V2). Rôle de tri : ce qui attend une action de
 * l'équipe d'abord, les chiffres ensuite. La validation des événements se
 * fait sur /admin/evenements ; le traitement des virements reste ici tant
 * que /admin/reversements n'est pas migrée (seul endroit où il existe).
 */
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

  // Filet de sécurité si pg_cron n'est pas disponible/activé sur ce projet
  // Supabase : la colonne statut se met quand même à jour à chaque visite
  // admin (voir supabase/migrations/20260712120000_evenements_termines.sql).
  await supabaseAdmin.rpc("cloturer_evenements_passes");

  const maintenant = new Date();
  const ilYA7Jours = new Date(maintenant.getTime() - 7 * 86400000).toISOString();

  const [
    billetsRes,
    ordersPayesRes,
    enVenteRes,
    organisateursRes,
    nouveauxOrgasRes,
    eventsEnAttenteRes,
    payoutsDemandesRes,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .neq("statut", "annule"),
    supabase.from("orders").select("total, events(taux_commission)").eq("statut", "paye"),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("statut", "publie"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "organisateur"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "organisateur")
      .gte("created_at", ilYA7Jours),
    supabase
      .from("events")
      .select("id, titre, date_debut, date_fin, ville, soumis_le, organisateur:profiles(nom, nom_public)")
      .eq("statut", "en_validation")
      .order("soumis_le", { ascending: true }),
    // supabaseAdmin : le téléphone de l'organisateur (nécessaire pour
    // effectuer le virement Mobile Money) n'est plus lisible via le rôle
    // Postgres `authenticated` (voir migration 20260717140000) — le
    // contrôle de rôle applicatif reste assuré par la vérification
    // `profil.role !== "admin"` ci-dessus, faite via le client de session.
    supabaseAdmin
      .from("payouts")
      .select(
        "id, montant, moyen, numero_destination, statut, created_at, organisateur:profiles(nom, telephone), events(titre, date_debut, date_fin, date_reference_virement)"
      )
      .in("statut", ["demande", "bloque"])
      .order("created_at", { ascending: true }),
  ]);

  const billetsVendus = billetsRes.count ?? 0;
  const commandesPayees = (ordersPayesRes.data ?? []) as unknown as {
    total: number;
    events: { taux_commission: number } | null;
  }[];
  const ventes = commandesPayees.reduce((n, o) => n + o.total, 0);
  const commissions = Math.round(
    commandesPayees.reduce((n, o) => n + o.total * (o.events?.taux_commission ?? 0.08), 0)
  );
  const enVente = enVenteRes.count ?? 0;
  const organisateurs = organisateursRes.count ?? 0;
  const nouveaux = nouveauxOrgasRes.count ?? 0;

  const aValider = (eventsEnAttenteRes.data as unknown as EventEnAttente[]) ?? [];
  const payouts = (payoutsDemandesRes.data as unknown as PayoutDemande[]) ?? [];
  const demandes = payouts.filter((p) => p.statut === "demande");
  // Sans événement lié (cas historique), la demande reste traitable, comme avant.
  const prets = demandes.filter((p) => (p.events ? payoutDisponible(p.events) : true));
  const prematures = demandes.filter((p) => p.events && !payoutDisponible(p.events));
  const geles = payouts.filter((p) => p.statut === "bloque");
  const totalPrets = prets.reduce((n, p) => n + p.montant, 0);

  const plusAncien = aValider[0];
  const rien = aValider.length === 0 && prets.length === 0;
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

  return (
    <Coquille nav={NAV_ADMIN} actif="accueil" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Tableau de bord</h1>
          <p className={s.sousTitre}>Ce qui attend l&apos;équipe, puis les chiffres de la plateforme.</p>
        </div>
      </div>

      <h2 className={s.intertitre} style={{ marginTop: 0 }}>
        À traiter
      </h2>
      {rien ? (
        <div className={s.vide}>
          <Icon name="check" size={32} />
          <p className={s.videTitre}>Rien à traiter</p>
          <p className={s.videTexte}>Aucun événement en attente de validation, aucun virement prêt à envoyer.</p>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8 }}>
          {plusAncien && (
            <li className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>{pluriel(aValider.length, "événement")} à valider</p>
                  <p className={s.carteMeta}>
                    Le plus ancien attend depuis {depuis(plusAncien.soumis_le).replace("il y a ", "")} : {plusAncien.titre}
                  </p>
                </div>
              </div>
              <Link href="/admin/evenements" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                <Icon name="shield" /> Valider
              </Link>
            </li>
          )}
          {prets.length > 0 && (
            <li className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>
                    {pluriel(prets.length, "virement")} à envoyer · {montant(totalPrets)}
                  </p>
                  <p className={s.carteMeta}>Événements tenus depuis plus de 3 jours, prêts à être versés.</p>
                </div>
              </div>
              <a href="#virements" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                <Icon name="wallet" /> Traiter
              </a>
            </li>
          )}
          {prematures.length > 0 && (
            <li className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>
                    {prematures.length} demande{prematures.length > 1 ? "s" : ""} prématurée{prematures.length > 1 ? "s" : ""}
                  </p>
                  <p className={s.carteMeta}>
                    {prematures.map((p) => p.events!.titre).join(", ")} : l&apos;événement n&apos;a pas encore eu lieu, le
                    virement ne peut pas partir.
                  </p>
                </div>
              </div>
              <a href="#virements" className={`${s.btn} ${s.btnGris}`}>
                Voir
              </a>
            </li>
          )}
        </ul>
      )}

      <section className={s.kpis} aria-label="Chiffres de la plateforme" style={{ marginTop: 24 }}>
        <div className={`${s.kpi} ${s.kpiHeros}`}>
          <span className={s.kpiLabel}>Commissions perçues</span>
          <span className={s.kpiValeur}>
            {nombre(commissions)} <small>FCFA</small>
          </span>
          <span className={s.kpiContexte}>sur {montant(ventes)} de ventes</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Billets vendus</span>
          <span className={s.kpiValeur}>{nombre(billetsVendus)}</span>
          <span className={s.kpiContexte}>tous événements</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>En vente</span>
          <span className={s.kpiValeur}>{enVente}</span>
          <span className={s.kpiContexte}>événements publiés</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Organisateurs</span>
          <span className={s.kpiValeur}>{organisateurs}</span>
          <span className={s.kpiContexte}>
            {nouveaux > 0 ? `dont ${nouveaux} inscrit${nouveaux > 1 ? "s" : ""} cette semaine` : "aucun nouveau cette semaine"}
          </span>
        </div>
      </section>

      {aValider.length > 0 && (
        <>
          <h2 className={s.intertitre}>
            En attente de validation
            <Link href="/admin/evenements">
              Tout voir <Icon name="chevron-right" />
            </Link>
          </h2>
          <ul className={s.pile} style={{ gap: 8 }}>
            {aValider.map((e) => (
              <li key={e.id} className={`${s.carte} ${s.carteLien}`}>
                <div className={s.carteHaut}>
                  <div>
                    <p className={s.carteTitre}>
                      <Link href={`/admin/evenements#${e.id}`}>{e.titre}</Link>
                    </p>
                    <p className={s.carteMeta}>
                      {e.organisateur?.nom_public || e.organisateur?.nom || "—"} · {dateCourte(e.date_debut, e.date_fin)} · {e.ville}
                    </p>
                  </div>
                  <span className={s.note} style={{ whiteSpace: "nowrap" }}>
                    soumis {depuis(e.soumis_le)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <p className={s.note} style={{ marginTop: 8 }}>
            Situation au {dateAnnee(maintenant.toISOString())}.
          </p>
        </>
      )}

      {/* ÉCART PREVIEW (transitoire) : le traitement des virements n'existe
          qu'ici en prod ; il part sur /admin/reversements quand elle sera migrée. */}
      {payouts.length > 0 && (
        <>
          <h2 className={s.intertitre} id="virements">
            Virements demandés
            <Link href="/admin/reversements">
              Historique <Icon name="chevron-right" />
            </Link>
          </h2>
          <ul className={s.pile} style={{ gap: 8 }}>
            {[...prets, ...prematures, ...geles].map((p) => {
              const eligible = p.events ? payoutDisponible(p.events) : true;
              return (
                <li key={p.id} className={`${s.carte} ${s.carteRangee}`}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre}>
                        {montant(p.montant)} · {p.organisateur?.nom ?? "—"}
                      </p>
                      <p className={s.carteMeta}>
                        {nomMoyen(p.moyen)} {formaterNumero(p.numero_destination)}
                        {p.organisateur?.telephone ? ` · tél. ${formaterNumero(p.organisateur.telephone)}` : ""}
                      </p>
                      <p className={s.carteMeta}>
                        {p.events ? `${p.events.titre} · ${dateCourte(p.events.date_debut, p.events.date_fin)}` : "—"} · demandé{" "}
                        {depuis(p.created_at)}
                      </p>
                    </div>
                  </div>
                  {p.statut === "bloque" ? (
                    <span className={s.note}>Gelé : événement annulé</span>
                  ) : eligible ? (
                    <BoutonVerse
                      payoutId={p.id}
                      montant={p.montant}
                      moyen={nomMoyen(p.moyen)}
                      numero={formaterNumero(p.numero_destination)}
                      organisateur={p.organisateur?.nom ?? "—"}
                    />
                  ) : (
                    <span className={s.note}>Événement pas encore tenu</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Coquille>
  );
}
