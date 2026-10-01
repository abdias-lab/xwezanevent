import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { payoutDisponible } from "@/lib/payouts";
import { getAchatsEnDouble } from "@/lib/achats-doubles";
import { formaterNumero as formaterTelephone } from "@/lib/telephone";
import BoutonVerse from "@/components/v2/admin/BoutonVerse";
import AchatDouble from "@/components/v2/admin/AchatDouble";
import { formaterNumero, nomMoyen } from "@/components/v2/admin/moyens";
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

/**
 * Tableau de bord admin (V2). Rôle de tri : ce qui attend une action de
 * l'équipe d'abord, les chiffres ensuite. La validation des événements se
 * fait sur /admin/evenements. Le traitement des virements existe ici ET sur
 * /admin/reversements (choix du 2026-09-28, écart assumé à la preview).
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
    supabase.from("orders").select("total, events(taux_commission, statut)").eq("statut", "paye"),
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
      .select("id, titre, date_debut, date_fin, ville, soumis_le, organisateur:profiles!organisateur_id(nom, nom_public)")
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
    events: { taux_commission: number; statut: string } | null;
  }[];
  // Comme la page Commissions : les ventes d'un événement annulé ou refusé
  // sont à rembourser, elles ne comptent ni en ventes ni en commissions.
  const commandesComptees = commandesPayees.filter((o) => o.events?.statut !== "annule" && o.events?.statut !== "refuse");
  const ventes = commandesComptees.reduce((n, o) => n + o.total, 0);
  const commissions = Math.round(
    commandesComptees.reduce((n, o) => n + o.total * (o.events?.taux_commission ?? 0.08), 0)
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

  // Paiement tardif d'une tentative abandonnée + nouvel achat (BUGS_REFONTE n°25).
  const doubles = await getAchatsEnDouble();

  const plusAncien = aValider[0];
  const rien = aValider.length === 0 && prets.length === 0 && doubles.length === 0;
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
          <p className={s.videTexte}>Aucun événement en attente de validation, aucun virement prêt à envoyer, aucun achat payé en double.</p>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8 }}>
          {doubles.map((d) => (
            <li key={d.origine} className={s.carte}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>
                    Payé {d.commandes.length} fois · {d.acheteur} · à rembourser
                  </p>
                  <p className={s.carteMeta}>
                    {d.evenement}.{d.telephone ? ` Tél. ${formaterTelephone(d.telephone)}.` : ""}
                    {d.email ? ` ${d.email}.` : ""} L&apos;acheteur a recommencé son achat pendant que le premier paiement était encore en cours :
                    rembourse la commande en trop sur son numéro Mobile Money, puis marque-la remboursée.{" "}
                    <Link href={`/admin/billets?q=${encodeURIComponent(d.email ?? d.acheteur)}`} style={{ textDecoration: "underline" }}>
                      Voir ses billets
                    </Link>
                  </p>
                </div>
              </div>
              <AchatDouble commandes={d.commandes} telephone={d.telephone ? formaterTelephone(d.telephone) : null} />
            </li>
          ))}
          {plusAncien && (
            <li className={`${s.carte} ${s.carteRangee}`}>
              <div className={s.carteHaut}>
                <div>
                  <p className={s.carteTitre}>{pluriel(aValider.length, "événement")} à valider</p>
                  <p className={s.carteMeta}>
                    {depuis(plusAncien.soumis_le) === "aujourd'hui"
                      ? `Le plus ancien a été soumis aujourd'hui : ${plusAncien.titre}`
                      : `Le plus ancien attend depuis ${depuis(plusAncien.soumis_le).replace("il y a ", "")} : ${plusAncien.titre}`}
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
              <Link href="/admin/reversements" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                <Icon name="wallet" /> Traiter
              </Link>
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
              <Link href="/admin/reversements" className={`${s.btn} ${s.btnGris}`}>
                Voir
              </Link>
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

      {/* ÉCART PREVIEW accepté (2026-09-28) : bouton de traitement gardé ici
          en plus de /admin/reversements. */}
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
                      virement={{
                        id: p.id,
                        montant: p.montant,
                        moyen: nomMoyen(p.moyen),
                        numero: formaterNumero(p.numero_destination),
                        organisateur: p.organisateur?.nom ?? "—",
                      }}
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
