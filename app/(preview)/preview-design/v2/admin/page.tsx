import s from "../espace.module.css";
import Coquille, { RubanEtats } from "../Coquille";
import Icon from "../../Icon";
import { SqueletteListe } from "../orga/ui";
import { AUJOURDHUI, dateAnnee, dateCourteOrga, etatPage, montant, nombre } from "../orga/_orga";
import {
  A,
  EVENEMENTS_ADMIN,
  NAV_ADMIN,
  ORGANISATEURS,
  VIREMENTS_ADMIN,
  chiffresAdmin,
  depuis,
  estEligible,
  evenementAdmin,
  joursDepuis,
  nomAffiche,
  organisateur,
} from "./_admin";

/**
 * Tableau de bord admin (preview V2). En prod : app/(admin)/admin/page.tsx.
 * Rôle de tri : ce qui attend une action de l'équipe d'abord, les chiffres
 * ensuite. Les actions elles-mêmes se font sur les pages dédiées.
 */
export default function V2Admin({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = etatPage(searchParams.etat);
  const vide = etat === "vide";

  const aValider = vide ? [] : EVENEMENTS_ADMIN.filter((e) => e.statut === "en_validation").sort((a, b) => a.soumisLe.localeCompare(b.soumisLe));
  const demandes = vide ? [] : VIREMENTS_ADMIN.filter((v) => v.statut === "demande");
  const prets = demandes.filter((v) => estEligible(evenementAdmin(v.evenement)!));
  const prematures = demandes.filter((v) => !estEligible(evenementAdmin(v.evenement)!));
  const totalPrets = prets.reduce((n, v) => n + v.montant, 0);

  const avecVentes = vide ? [] : EVENEMENTS_ADMIN.filter((e) => e.statut !== "annule" && e.statut !== "refuse").map(chiffresAdmin);
  const commissions = avecVentes.reduce((n, c) => n + c.commission, 0);
  const vendus = avecVentes.reduce((n, c) => n + c.vendus, 0);
  const brut = avecVentes.reduce((n, c) => n + c.brut, 0);
  const enVente = vide ? 0 : EVENEMENTS_ADMIN.filter((e) => e.statut === "publie").length;
  const orgas = vide ? [] : ORGANISATEURS;
  const nouveaux = orgas.filter((o) => joursDepuis(o.inscritLe) <= 7).length;

  const plusAncien = aValider[0];
  const rien = aValider.length === 0 && prets.length === 0;

  return (
    <Coquille nav={NAV_ADMIN} actif="accueil">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Tableau de bord</h1>
          <p className={s.sousTitre}>Ce qui attend l&apos;équipe, puis les chiffres de la plateforme.</p>
        </div>
      </div>

      {etat === "chargement" ? (
        <SqueletteListe />
      ) : (
        <>
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
              {aValider.length > 0 && (
                <li className={`${s.carte} ${s.carteRangee}`}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre}>
                        {aValider.length} événement{aValider.length > 1 ? "s" : ""} à valider
                      </p>
                      <p className={s.carteMeta}>
                        {depuis(plusAncien.soumisLe) === "aujourd'hui"
                          ? `Le plus ancien a été soumis aujourd'hui : ${plusAncien.titre}`
                          : `Le plus ancien attend depuis ${depuis(plusAncien.soumisLe).replace("il y a ", "")} : ${plusAncien.titre}`}
                      </p>
                    </div>
                  </div>
                  <a href={`${A}/evenements`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                    <Icon name="shield" /> Valider
                  </a>
                </li>
              )}
              {prets.length > 0 && (
                <li className={`${s.carte} ${s.carteRangee}`}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre}>
                        {prets.length} virement{prets.length > 1 ? "s" : ""} à envoyer · {montant(totalPrets)}
                      </p>
                      <p className={s.carteMeta}>Événements tenus depuis plus de 3 jours, prêts à être versés.</p>
                    </div>
                  </div>
                  <a href={`${A}/virements`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
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
                        {prematures.map((v) => evenementAdmin(v.evenement)!.titre).join(", ")} : l&apos;événement n&apos;a pas encore eu lieu, le virement
                        ne peut pas partir.
                      </p>
                    </div>
                  </div>
                  <a href={`${A}/virements`} className={`${s.btn} ${s.btnGris}`}>
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
              <span className={s.kpiContexte}>sur {montant(brut)} de ventes</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Billets vendus</span>
              <span className={s.kpiValeur}>{nombre(vendus)}</span>
              <span className={s.kpiContexte}>tous événements</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>En vente</span>
              <span className={s.kpiValeur}>{enVente}</span>
              <span className={s.kpiContexte}>événements publiés</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Organisateurs</span>
              <span className={s.kpiValeur}>{orgas.length}</span>
              <span className={s.kpiContexte}>{nouveaux > 0 ? `dont ${nouveaux} inscrit${nouveaux > 1 ? "s" : ""} cette semaine` : "aucun nouveau cette semaine"}</span>
            </div>
          </section>

          {aValider.length > 0 && (
            <>
              <h2 className={s.intertitre}>
                En attente de validation
                <a href={`${A}/evenements`}>
                  Tout voir <Icon name="chevron-right" />
                </a>
              </h2>
              <ul className={s.pile} style={{ gap: 8 }}>
                {aValider.map((e) => (
                  <li key={e.id} className={`${s.carte} ${s.carteLien}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>
                          <a href={`${A}/evenements#${e.id}`}>{e.titre}</a>
                        </p>
                        <p className={s.carteMeta}>
                          {nomAffiche(organisateur(e.organisateur))} · {dateCourteOrga(e.debut, e.fin)} · {e.ville}
                        </p>
                      </div>
                      <span className={s.note} style={{ whiteSpace: "nowrap" }}>
                        soumis {depuis(e.soumisLe)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className={s.note} style={{ marginTop: 8 }}>
                Situation au {dateAnnee(AUJOURDHUI)}.
              </p>
            </>
          )}
        </>
      )}

      <RubanEtats chemin={A} />
    </Coquille>
  );
}
