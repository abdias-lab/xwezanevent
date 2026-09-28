import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import Compteur from "@/components/v2/Compteur";
import Jauge from "@/components/v2/Jauge";
import DemandeVirement from "@/components/v2/orga/DemandeVirement";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { dateAnnee, dateCourte, montant, nombre, pourcent } from "@/components/v2/format";
import { StatutEvt, type Statut } from "@/components/v2/statuts";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Espace organisateur — XwézanEvent",
};

const COLS = { "--cols": "minmax(0, 2fr) minmax(0, 1.4fr) 128px 132px 200px" } as CSSProperties;

interface EventOrga {
  id: string;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  date_reference_virement: string;
  ville: string;
  statut: Statut;
  taux_commission: number;
  pays_code: string;
  ticket_types: { prix: number; quantite_totale: number; quantite_vendue: number }[];
}

const STATUTS_SANS_VIREMENT = new Set(["annule", "refuse"]);

/**
 * Tableau de bord organisateur (V2), repris de la preview. Une seule action
 * par événement (la plus utile) ; le reste (modifier, annuler, export, lien
 * de scan, billets) est dans la fiche /orga/evenements/[id]. Calculs de la
 * prod : brut sur les billets vendus, net au taux de chaque événement, solde
 * disponible = net − virements demandés ou traités, J+3 (lib/payouts.ts).
 */
export default async function Orga() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga");

  const [{ data }, { data: payoutsData }, { data: profil }] = await Promise.all([
    supabase
      .from("events")
      .select("id, titre, date_debut, date_fin, date_reference_virement, ville, statut, taux_commission, pays_code, ticket_types(prix, quantite_totale, quantite_vendue)")
      .eq("organisateur_id", user.id)
      .order("date_debut", { ascending: false }),
    supabase.from("payouts").select("event_id, montant, statut").eq("organisateur_id", user.id).in("statut", ["demande", "traite"]),
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
  ]);

  const events = (data as unknown as EventOrga[]) ?? [];
  const dejaDemande = new Map<string, number>();
  for (const p of (payoutsData ?? []) as { event_id: string; montant: number }[]) dejaDemande.set(p.event_id, (dejaDemande.get(p.event_id) ?? 0) + p.montant);

  const lignes = events.map((e) => {
    const vendus = e.ticket_types.reduce((n, t) => n + t.quantite_vendue, 0);
    const capacite = e.ticket_types.reduce((n, t) => n + t.quantite_totale, 0);
    const brut = e.ticket_types.reduce((n, t) => n + t.prix * t.quantite_vendue, 0);
    const net = Math.round(brut * (1 - e.taux_commission));
    const disponible = STATUTS_SANS_VIREMENT.has(e.statut) ? 0 : Math.max(0, net - (dejaDemande.get(e.id) ?? 0));
    return { e, vendus, capacite, brut, net, disponible, peutDemander: payoutDisponible(e), disponibleLe: dateAnnee(dateDisponibilitePayout(e)) };
  });

  const t = {
    net: lignes.reduce((n, l) => n + l.net, 0),
    brut: lignes.reduce((n, l) => n + l.brut, 0),
    vendus: lignes.reduce((n, l) => n + l.vendus, 0),
    capacite: lignes.reduce((n, l) => n + l.capacite, 0),
    publies: events.filter((e) => e.statut === "publie").length,
    disponible: lignes.reduce((n, l) => n + (l.peutDemander ? l.disponible : 0), 0),
  };
  // Taux effectif : peut différer de 8 % si un événement a une commission négociée.
  const taux = t.brut > 0 ? Math.round((1 - t.net / t.brut) * 100) : 8;
  const remplissage = t.capacite > 0 ? Math.round((t.vendus / t.capacite) * 100) : 0;
  const aVirer = lignes.filter((l) => l.peutDemander && l.disponible > 0);
  const enValidation = events.filter((e) => e.statut === "en_validation");

  const nomPerso = profil?.nom || (user.user_metadata?.nom as string | undefined) || user.email || "organisateur";
  const nom = profil?.nom_public || nomPerso;
  const alerteNomPublic = !profil?.nom_public && (
    <p className={s.alerte}>
      <Icon name="info" />
      <span>
        Le nom affiché sur tes événements est ton nom personnel. <Link href="/orga/parametres">Personnalise-le dans les Paramètres</Link>.
      </span>
    </p>
  );

  return (
    <Coquille nav={NAV_ORGA} actif="accueil" compte={{ nom, email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Bonjour, {nom}</h1>
          <p className={s.sousTitre}>Voici comment se portent tes événements.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <>
          {alerteNomPublic}
          <div className={s.vide}>
            <Icon name="calendar" size={32} />
            <p className={s.videTitre}>Aucun événement</p>
            <p className={s.videTexte}>Publie ton premier événement pour commencer à vendre des billets. 8 % de commission, uniquement sur les billets vendus.</p>
            <Link href="/creer" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
              <Icon name="plus" /> Créer un événement
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* Écart assumé : la preview ne montre l'alerte que sans événement ; la prod l'affiche tant qu'il n'y a pas de nom public. */}
          {alerteNomPublic}
          <section className={s.kpis} aria-label="Chiffres clés">
            <div className={`${s.kpi} ${s.kpiHeros}`}>
              <span className={s.kpiLabel}>Revenu net</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.net} /> <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>après {taux}&nbsp;% de frais, tous événements</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Billets vendus</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.vendus} />
              </span>
              <span
                className={s.kpiBarre}
                role="meter"
                aria-valuemin={0}
                aria-valuemax={t.capacite}
                aria-valuenow={t.vendus}
                aria-label={`Taux de remplissage : ${pourcent(t.vendus, t.capacite)}`}
              >
                <span style={{ width: `${remplissage}%` }} />
              </span>
              <span className={s.kpiContexte}>
                {pourcent(t.vendus, t.capacite)} des {nombre(t.capacite)} places
              </span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>En vente</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.publies} />
              </span>
              <span className={s.kpiContexte}>{events.length} événement{events.length > 1 ? "s" : ""} au total</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Revenu brut</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.brut} /> <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>avant frais</span>
            </div>
            {/* Doré seulement s'il y a une action à faire (montant à récupérer). */}
            <div className={`${s.kpi} ${t.disponible > 0 ? s.kpiAction : ""}`}>
              <span className={s.kpiLabel}>À virer</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.disponible} /> <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>disponible maintenant</span>
            </div>
          </section>

          {(aVirer.length > 0 || enValidation.length > 0) && (
            <>
              <h2 className={s.intertitre}>À faire</h2>
              <ul className={s.pile} style={{ gap: 8 }}>
                {aVirer.map((l) => (
                  <li key={l.e.id} className={`${s.carte} ${s.carteRangee}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>{montant(l.disponible)} à récupérer</p>
                        <p className={s.carteMeta}>
                          {l.e.titre} · terminé le {dateAnnee(l.e.date_fin ?? l.e.date_debut)}
                        </p>
                      </div>
                    </div>
                    <DemandeVirement
                      eventId={l.e.id}
                      titre={l.e.titre}
                      disponible={l.disponible}
                      tauxCommission={l.e.taux_commission}
                      paysCode={l.e.pays_code}
                      peutDemander
                      grand
                    />
                  </li>
                ))}
                {enValidation.map((e) => (
                  <li key={e.id} className={`${s.carte} ${s.carteLien}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>
                          <Link href={`/orga/evenements/${e.id}`}>{e.titre}</Link>
                        </p>
                        <p className={s.carteMeta}>En cours de validation par l&apos;équipe Xwézan. Il sera visible dès son approbation.</p>
                      </div>
                      <StatutEvt statut={e.statut} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className={s.intertitre}>
            Mes événements
            <Link href="/creer">
              <Icon name="plus" /> Nouveau
            </Link>
          </h2>
          <ul className={s.liste}>
            <li className={s.enteteListe} style={COLS} aria-hidden="true">
              <span>Événement</span>
              <span>Ventes</span>
              <span>Revenu brut</span>
              <span>Statut</span>
              <span>Action</span>
            </li>
            {lignes.map((l) => (
              <li key={l.e.id} className={`${s.carte} ${s.carteLien}`} style={COLS}>
                <div className={s.carteHaut}>
                  <div>
                    <p className={s.carteTitre}>
                      <Link href={`/orga/evenements/${l.e.id}`}>{l.e.titre}</Link>
                    </p>
                    <p className={s.carteMeta}>
                      {dateCourte(l.e.date_debut, l.e.date_fin)} · {l.e.ville}
                    </p>
                  </div>
                  <span className={s.masqueDesktop}>
                    <StatutEvt statut={l.e.statut} />
                  </span>
                </div>
                <div className={s.carteCorps}>
                  <Jauge vendus={l.vendus} total={l.capacite} neutre={l.e.statut === "annule" || l.e.statut === "termine"} />
                </div>
                <span className={`${s.cellule} ${s.montant} ${s.chiffre}`}>{l.brut > 0 ? montant(l.brut) : "—"}</span>
                <span className={s.cellule}>
                  <StatutEvt statut={l.e.statut} />
                </span>
                <div className={s.carteBas}>
                  <span className={`${s.montant} ${s.masqueDesktop}`}>{l.brut > 0 ? montant(l.brut) : "Aucune vente"}</span>
                  <ActionLigne l={l} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Coquille>
  );
}

type Ligne = {
  e: EventOrga;
  disponible: number;
  peutDemander: boolean;
  disponibleLe: string;
};

/** Une seule action par ligne, la plus utile selon l'état ; le reste est dans la fiche. */
function ActionLigne({ l }: { l: Ligne }) {
  if (l.disponible > 0 && l.peutDemander)
    return (
      <DemandeVirement
        eventId={l.e.id}
        titre={l.e.titre}
        disponible={l.disponible}
        tauxCommission={l.e.taux_commission}
        paysCode={l.e.pays_code}
        peutDemander
        libelle="Virement"
      />
    );
  if (l.e.statut === "publie")
    return (
      <Link href="/scan" className={`${s.btn} ${s.btnGris}`}>
        <Icon name="qr" /> Scanner
      </Link>
    );
  if (l.disponible > 0) return <span className={s.note}>Virement dès le {l.disponibleLe}</span>;
  return (
    <span className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      Gérer <Icon name="chevron-right" />
    </span>
  );
}
