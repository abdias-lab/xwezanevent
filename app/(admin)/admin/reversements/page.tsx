import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateAnnee, dateCourte, dateHeure, depuis, montant, nombre } from "@/components/v2/format";
import { formaterNumero, nomMoyen } from "@/components/v2/admin/moyens";
import Virements, { type VirementVue } from "@/components/v2/admin/Virements";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Reversements — Administration — XwézanEvent",
};

const ONGLETS = [
  { cle: "attente", libelle: "À traiter", statut: "demande" },
  { cle: "traites", libelle: "Traités", statut: "traite" },
  { cle: "geles", libelle: "Gelés", statut: "bloque" },
] as const;

const COLS = { "--cols": "minmax(0, 1.6fr) minmax(0, 1.4fr) 140px 160px 150px" } as CSSProperties;

interface PayoutLigne {
  id: string;
  montant: number;
  moyen: string;
  numero_destination: string;
  statut: string;
  created_at: string;
  traite_le: string | null;
  organisateur: { nom: string; nom_public: string | null; telephone: string | null } | null;
  events: { titre: string; date_debut: string; date_fin: string | null; date_reference_virement: string } | null;
}

/**
 * Virements (V2). Onglets À traiter / Traités / Gelés ; les demandes prêtes
 * passent avant les prématurées (J+3 non atteint, traitement refusé par la
 * route). Les virements traités et gelés restent consultables : ce sont des
 * mouvements d'argent réels.
 */
export default async function AdminReversements({ searchParams }: { searchParams: { onglet?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/reversements");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const onglet = ONGLETS.find((o) => o.cle === searchParams.onglet) ?? ONGLETS[0];

  // supabaseAdmin : numero_destination et le téléphone de l'organisateur ne
  // sont plus lisibles via le rôle Postgres `authenticated` — le contrôle
  // de rôle applicatif reste assuré par la vérification `profil.role`
  // ci-dessus, faite via le client de session.
  const { data } = await supabaseAdmin
    .from("payouts")
    .select(
      "id, montant, moyen, numero_destination, statut, created_at, traite_le, organisateur:profiles(nom, nom_public, telephone), events(titre, date_debut, date_fin, date_reference_virement)"
    )
    .order("created_at", { ascending: false });

  const tous = (data as unknown as PayoutLigne[]) ?? [];
  const liste = tous.filter((p) => p.statut === onglet.statut);
  const compte = (st: string) => tous.filter((p) => p.statut === st).length;
  // Sans événement lié (cas historique), la demande reste traitable, comme avant.
  const eligible = (p: PayoutLigne) => (p.events ? payoutDisponible(p.events) : true);
  const orgaAffiche = (p: PayoutLigne) => p.organisateur?.nom_public || p.organisateur?.nom || "—";

  const vues: VirementVue[] = liste
    .map((p) => ({
      id: p.id,
      montant: p.montant,
      moyen: nomMoyen(p.moyen),
      numero: formaterNumero(p.numero_destination),
      orgaAffiche: orgaAffiche(p),
      orgaPerso: p.organisateur?.nom ?? "—",
      orgaTel: p.organisateur?.telephone ? formaterNumero(p.organisateur.telephone) : null,
      evenement: p.events?.titre ?? "—",
      dateEvenement: p.events ? dateCourte(p.events.date_debut, p.events.date_fin) : "—",
      eligible: eligible(p),
      eligibleLe: p.events ? dateAnnee(dateDisponibilitePayout(p.events)) : "—",
      demande: depuis(p.created_at),
    }))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible));

  const aVerser = tous.filter((p) => p.statut === "demande" && eligible(p)).reduce((n, p) => n + p.montant, 0);
  const verse = tous.filter((p) => p.statut === "traite").reduce((n, p) => n + p.montant, 0);

  return (
    <Coquille nav={NAV_ADMIN} actif="virements" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Virements</h1>
          <p className={s.sousTitre}>Envoie l&apos;argent par Mobile Money, puis marque la demande comme versée.</p>
        </div>
      </div>

      <section className={`${s.kpis} ${s.kpis3}`} aria-label="Montants" style={{ marginBottom: 24 }}>
        <div className={`${s.kpi} ${s.kpiHeros}`}>
          <span className={s.kpiLabel}>À verser</span>
          <span className={s.kpiValeur}>
            {nombre(aVerser)} <small>FCFA</small>
          </span>
          <span className={s.kpiContexte}>demandes prêtes</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Déjà versé</span>
          <span className={s.kpiValeur}>
            {nombre(verse)} <small>FCFA</small>
          </span>
          <span className={s.kpiContexte}>au total</span>
        </div>
        <div className={s.kpi}>
          <span className={s.kpiLabel}>Gelés</span>
          <span className={s.kpiValeur}>{compte("bloque")}</span>
          <span className={s.kpiContexte}>événements annulés</span>
        </div>
      </section>

      <div className={s.puces} role="group" aria-label="Filtrer les virements" style={{ marginBottom: 16 }}>
        {ONGLETS.map((o) => (
          <Link
            key={o.cle}
            href={o.cle === "attente" ? "/admin/reversements" : `/admin/reversements?onglet=${o.cle}`}
            className={`${s.puce} ${o.cle === onglet.cle ? s.puceOn : ""}`}
            aria-current={o.cle === onglet.cle ? "page" : undefined}
          >
            {o.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{compte(o.statut)}</span>
          </Link>
        ))}
      </div>

      {liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="wallet" size={32} />
          <p className={s.videTitre}>{onglet.cle === "attente" ? "Aucune demande en attente" : `Aucun virement « ${onglet.libelle.toLowerCase()} »`}</p>
          <p className={s.videTexte}>
            {onglet.cle === "attente" ? "Les organisateurs demandent leur virement 3 jours après leur événement." : "Rien à afficher ici pour l'instant."}
          </p>
        </div>
      ) : onglet.cle === "attente" ? (
        <Virements virements={vues} />
      ) : (
        <>
          {onglet.cle === "geles" && (
            <p className={`${s.alerte} ${s.alerteDanger}`}>
              <Icon name="alert" />
              <span>Un virement est gelé quand son événement est annulé : il n&apos;est pas versé et ne compte plus dans le solde de l&apos;organisateur.</span>
            </p>
          )}
          <ul className={s.liste}>
            <li className={s.enteteListe} style={COLS} aria-hidden="true">
              <span>Organisateur</span>
              <span>Événement</span>
              <span>Montant</span>
              <span>Vers</span>
              <span>{onglet.cle === "traites" ? "Traité le" : "Demandé le"}</span>
            </li>
            {liste.map((p) => (
              <li key={p.id} className={s.carte} style={COLS}>
                <div className={s.carteHaut}>
                  <div>
                    <p className={s.carteTitre} style={{ fontSize: 15 }}>
                      {orgaAffiche(p)}
                    </p>
                  </div>
                </div>
                <dl className={s.paires}>
                  <dt>Événement</dt>
                  <dd>{p.events?.titre ?? "—"}</dd>
                  <dt>Montant</dt>
                  <dd className={`${s.montant} ${s.chiffre}`}>{montant(p.montant)}</dd>
                  <dt>Vers</dt>
                  <dd>
                    {nomMoyen(p.moyen)}
                    <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                      {formaterNumero(p.numero_destination)}
                    </span>
                  </dd>
                  <dt>{onglet.cle === "traites" ? "Traité le" : "Demandé le"}</dt>
                  <dd>{dateHeure(onglet.cle === "traites" && p.traite_le ? p.traite_le : p.created_at)}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </Coquille>
  );
}
