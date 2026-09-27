import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { dateAnnee, dateCourteOrga, montant, nombre } from "../../orga/_orga";
import { A, NAV_ADMIN, VIREMENTS_ADMIN, depuis, eligibleLe, estEligible, evenementAdmin, nomAffiche, organisateur, type VirementAdmin } from "../_admin";
import Virements, { type VirementVue } from "./Virements";

const ONGLETS = [
  { cle: "attente", libelle: "À traiter", statut: "demande" },
  { cle: "traites", libelle: "Traités", statut: "traite" },
  { cle: "geles", libelle: "Gelés", statut: "bloque" },
] as const;

const COLS = { "--cols": "minmax(0, 1.6fr) minmax(0, 1.4fr) 140px 160px 150px" } as CSSProperties;
const dateHeure = (d: string) => `${dateAnnee(d.slice(0, 10))} · ${d.slice(11, 16)}`;

/**
 * Virements (preview V2). En prod : app/(admin)/admin/reversements + le bloc
 * « Demandes de virement » du tableau de bord. Les demandes prêtes passent
 * avant les prématurées (J+3 non atteint, traitement refusé par la route).
 */
export default function V2AdminVirements({ searchParams }: { searchParams: { onglet?: string; etat?: string } }) {
  const onglet = ONGLETS.find((o) => o.cle === searchParams.onglet) ?? ONGLETS[0];
  const vide = searchParams.etat === "vide";
  const tous = vide ? [] : VIREMENTS_ADMIN;
  const liste = tous.filter((v) => v.statut === onglet.statut);
  const compte = (st: VirementAdmin["statut"]) => tous.filter((v) => v.statut === st).length;

  const vues: VirementVue[] = liste
    .map((v) => {
      const e = evenementAdmin(v.evenement)!;
      const o = organisateur(v.organisateur);
      return {
        id: v.id,
        montant: v.montant,
        moyen: v.moyen,
        numero: v.numero,
        orgaAffiche: nomAffiche(o),
        orgaPerso: o.nom,
        orgaTel: o.tel,
        evenement: e.titre,
        dateEvenement: dateCourteOrga(e.debut, e.fin),
        eligible: estEligible(e),
        eligibleLe: dateAnnee(eligibleLe(e)),
        demande: depuis(v.demandeLe),
      };
    })
    .sort((a, b) => Number(b.eligible) - Number(a.eligible));

  const aVerser = tous.filter((v) => v.statut === "demande" && estEligible(evenementAdmin(v.evenement)!)).reduce((n, v) => n + v.montant, 0);
  const verse = tous.filter((v) => v.statut === "traite").reduce((n, v) => n + v.montant, 0);

  return (
    <Coquille nav={NAV_ADMIN} actif="virements">
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
          <a
            key={o.cle}
            href={o.cle === "attente" ? `${A}/virements` : `${A}/virements?onglet=${o.cle}`}
            className={`${s.puce} ${o.cle === onglet.cle ? s.puceOn : ""}`}
            aria-current={o.cle === onglet.cle ? "page" : undefined}
          >
            {o.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{compte(o.statut)}</span>
          </a>
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
            {liste.map((v) => {
              const e = evenementAdmin(v.evenement)!;
              return (
                <li key={v.id} className={s.carte} style={COLS}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre} style={{ fontSize: 15 }}>
                        {nomAffiche(organisateur(v.organisateur))}
                      </p>
                    </div>
                  </div>
                  <dl className={s.paires}>
                    <dt>Événement</dt>
                    <dd>{e.titre}</dd>
                    <dt>Montant</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{montant(v.montant)}</dd>
                    <dt>Vers</dt>
                    <dd>
                      {v.moyen}
                      <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                        {v.numero}
                      </span>
                    </dd>
                    <dt>{onglet.cle === "traites" ? "Traité le" : "Demandé le"}</dt>
                    <dd>{dateHeure(onglet.cle === "traites" && v.traiteLe ? v.traiteLe : v.demandeLe)}</dd>
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <RubanEtats chemin={`${A}/virements`} etats={["normal", "vide"]} />
    </Coquille>
  );
}
