import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { chiffresOrganisateur } from "@/lib/orga-chiffres";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import DemandeVirement from "@/components/v2/orga/DemandeVirement";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { dateAnnee, montant, nombre } from "@/components/v2/format";
import { formaterNumero, nomMoyen } from "@/components/v2/admin/moyens";
import { StatutVirementV2, type StatutVirement } from "@/components/v2/statuts";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Mes reversements — XwézanEvent",
};

const COLS = { "--cols": "minmax(0, 1.6fr) 136px minmax(0, 1.4fr) 116px 116px 112px" } as CSSProperties;

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

/**
 * Mes reversements (V2), repris de la preview : en plus de l'historique de la
 * prod, ce qui est à récupérer maintenant et ce qui le sera bientôt. Chiffres
 * partagés avec le tableau de bord (lib/orga-chiffres.ts).
 */
export default async function OrgaReversements() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/reversements");

  // Client de session (pas supabaseAdmin) : la policy RLS "Organisateurs can
  // read their own payouts" (organisateur_id = auth.uid()) suffit.
  const [{ lignes, totaux: t }, { data: payoutsData }, { data: profil }] = await Promise.all([
    chiffresOrganisateur(supabase, user.id),
    supabase
      .from("payouts")
      .select("id, montant, moyen, numero_destination, statut, created_at, traite_le, events(titre)")
      .eq("organisateur_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
  ]);

  const virements = ((payoutsData as unknown as PayoutLigne[]) ?? []).map((p) => ({
    ...p,
    statutV2: (p.statut === "bloque" ? "gele" : p.statut) as StatutVirement,
  }));
  const recu = virements.filter((v) => v.statut === "traite").reduce((n, v) => n + v.montant, 0);
  const enAttente = virements.filter((v) => v.statut === "demande");
  const attente = enAttente.reduce((n, v) => n + v.montant, 0);
  const aVirer = lignes.filter((l) => l.peutDemander && l.disponible > 0);
  // Ventes encore ouvertes : le montant n'est qu'une estimation à ce jour.
  const aVenir = lignes.filter((l) => !l.peutDemander && l.disponible > 0);
  const gele = virements.some((v) => v.statut === "bloque");
  const nom = profil?.nom_public || profil?.nom || user.email || "organisateur";

  return (
    <Coquille nav={NAV_ORGA} actif="reversements" compte={{ nom, email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Mes reversements</h1>
          <p className={s.sousTitre}>Ce que tu as reçu, ce qui arrive et ce que tu peux demander.</p>
        </div>
      </div>

      {virements.length === 0 && aVirer.length === 0 && aVenir.length === 0 ? (
        <div className={s.vide}>
          <Icon name="wallet" size={32} />
          <p className={s.videTitre}>Aucun reversement</p>
          <p className={s.videTexte}>
            Tu peux demander un virement 3 jours après la tenue de ton événement. Tu reçois le montant des ventes, moins 8 % de commission, sur ton compte Mobile Money.
          </p>
          <Link href="/orga" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="back" /> Tableau de bord
          </Link>
        </div>
      ) : (
        <>
          <section className={`${s.kpis} ${s.kpis3}`} aria-label="Chiffres des reversements">
            <div className={`${s.kpi} ${s.kpiHeros}`}>
              <span className={s.kpiLabel}>Disponible</span>
              <span className={s.kpiValeur}>
                {nombre(t.disponible)} <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>à demander maintenant</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>En attente</span>
              <span className={s.kpiValeur}>
                {nombre(attente)} <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>
                {enAttente.length} demande{enAttente.length > 1 ? "s" : ""} en cours
              </span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Reçu</span>
              <span className={s.kpiValeur}>
                {nombre(recu)} <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>au total, déjà versé</span>
            </div>
          </section>

          {aVirer.length > 0 && (
            <>
              <h2 className={s.intertitre}>À récupérer</h2>
              <ul className={s.pile} style={{ gap: 8 }}>
                {aVirer.map((l) => (
                  <li key={l.e.id} className={`${s.carte} ${s.carteRangee}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>{montant(l.disponible)}</p>
                        <p className={s.carteMeta}>
                          {l.e.titre} · terminé le {dateAnnee(l.e.date_fin ?? l.e.date_debut)}
                          {l.dejaDemande > 0 && ` · ${montant(l.dejaDemande)} déjà demandés`}
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
              </ul>
            </>
          )}

          {aVenir.length > 0 && (
            <>
              <h2 className={s.intertitre}>Bientôt disponible</h2>
              <ul className={s.pile} style={{ gap: 8 }}>
                {aVenir.map((l) => (
                  <li key={l.e.id} className={`${s.carte} ${s.carteLien}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>
                          <Link href={`/orga/evenements/${l.e.id}`}>{l.e.titre}</Link>
                        </p>
                        <p className={s.carteMeta}>
                          <b className={s.montant}>{montant(l.disponible)}</b> à ce jour · virement possible dès le {dateAnnee(l.disponibleLe)}
                        </p>
                      </div>
                      <Icon name="clock" size={20} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className={s.note} style={{ marginTop: 8 }}>
                Montants nets de la commission, arrêtés aux ventes d&apos;aujourd&apos;hui. Ils évoluent jusqu&apos;à la fin de la billetterie.
              </p>
            </>
          )}

          <h2 className={s.intertitre}>Historique</h2>
          {gele && (
            <p className={`${s.alerte} ${s.alerteDanger}`}>
              <Icon name="alert" />
              <span>
                Un virement est gelé quand son événement est annulé : il n&apos;est pas versé. Une question ? Écris-nous à{" "}
                <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>.
              </span>
            </p>
          )}
          {virements.length === 0 ? (
            <div className={s.vide}>
              <Icon name="wallet" size={32} />
              <p className={s.videTitre}>Aucune demande pour l&apos;instant</p>
              <p className={s.videTexte}>Tes demandes de virement apparaîtront ici, avec leur statut de traitement.</p>
            </div>
          ) : (
            <ul className={s.liste}>
              <li className={s.enteteListe} style={COLS} aria-hidden="true">
                <span>Événement</span>
                <span>Montant</span>
                <span>Vers</span>
                <span>Demandé le</span>
                <span>Traité le</span>
                <span>Statut</span>
              </li>
              {virements.map((v) => (
                <li key={v.id} className={s.carte} style={{ ...COLS, gap: 8 }}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre} style={{ fontSize: 15 }}>
                        {v.events?.titre ?? "—"}
                      </p>
                    </div>
                    <span className={s.masqueDesktop}>
                      <StatutVirementV2 statut={v.statutV2} />
                    </span>
                  </div>
                  <dl className={s.paires}>
                    <dt>Montant</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{montant(v.montant)}</dd>
                    <dt>Vers</dt>
                    <dd>
                      {nomMoyen(v.moyen)}
                      <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                        {formaterNumero(v.numero_destination)}
                      </span>
                    </dd>
                    <dt>Demandé le</dt>
                    <dd>{dateAnnee(v.created_at)}</dd>
                    <dt>Traité le</dt>
                    <dd>{v.traite_le ? dateAnnee(v.traite_le) : "—"}</dd>
                  </dl>
                  <span className={s.cellule}>
                    <StatutVirementV2 statut={v.statutV2} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Coquille>
  );
}
