import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import DemandeVirement from "../DemandeVirement";
import { SqueletteListe, StatutVirement } from "../ui";
import { COMMISSION, EVENEMENTS_ORGA, VIREMENTS, chiffres, dateAnnee, etatPage, montant, nombre, totaux } from "../_orga";

const COLS = { "--cols": "minmax(0, 1.6fr) 136px minmax(0, 1.4fr) 116px 116px 112px" } as CSSProperties;

/**
 * Mes reversements. En prod, la page n'est qu'un historique : ici elle regroupe
 * aussi ce qui est à récupérer maintenant et ce qui le sera bientôt, pour que
 * l'organisateur n'ait pas à passer par le tableau de bord.
 */
export default function V2Reversements({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = etatPage(searchParams.etat);
  const evs = etat === "vide" ? [] : EVENEMENTS_ORGA;
  const virements = etat === "vide" ? [] : VIREMENTS;

  const t = totaux(evs);
  const recu = virements.filter((v) => v.statut === "traite").reduce((n, v) => n + v.montant, 0);
  const enAttente = virements.filter((v) => v.statut === "demande");
  const attente = enAttente.reduce((n, v) => n + v.montant, 0);
  const avecChiffres = evs.map((e) => ({ e, c: chiffres(e) }));
  const aVirer = avecChiffres.filter(({ c }) => c.peutDemander && c.disponible > 0);
  // Ventes encore ouvertes : le montant n'est qu'une estimation à ce jour.
  const aVenir = avecChiffres.filter(({ e, c }) => !c.peutDemander && c.disponible > 0 && e.virementLe);
  const gele = virements.some((v) => v.statut === "gele");

  return (
    <Coquille actif="reversements">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Mes reversements</h1>
          <p className={s.sousTitre}>Ce que tu as reçu, ce qui arrive et ce que tu peux demander.</p>
        </div>
      </div>

      {etat === "chargement" ? (
        <SqueletteListe n={3} />
      ) : virements.length === 0 && aVirer.length === 0 && aVenir.length === 0 ? (
        <div className={s.vide}>
          <Icon name="wallet" size={32} />
          <p className={s.videTitre}>Aucun reversement</p>
          <p className={s.videTexte}>
            Tu peux demander un virement 3 jours après la tenue de ton événement. Tu reçois le montant des ventes, moins {Math.round(COMMISSION * 100)} % de commission, sur
            ton compte Mobile Money.
          </p>
          <a href={`${B}/orga`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="back" /> Tableau de bord
          </a>
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
                {aVirer.map(({ e, c }) => (
                  <li key={e.id} className={`${s.carte} ${s.carteRangee}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>{montant(c.disponible)}</p>
                        <p className={s.carteMeta}>
                          {e.titre} · terminé le {dateAnnee(e.debut)}
                          {e.dejaDemande > 0 && ` · ${montant(e.dejaDemande)} déjà demandés`}
                        </p>
                      </div>
                    </div>
                    <DemandeVirement titre={e.titre} disponible={c.disponible} peutDemander grand />
                  </li>
                ))}
              </ul>
            </>
          )}

          {aVenir.length > 0 && (
            <>
              <h2 className={s.intertitre}>Bientôt disponible</h2>
              <ul className={s.pile} style={{ gap: 8 }}>
                {aVenir.map(({ e, c }) => (
                  <li key={e.id} className={`${s.carte} ${s.carteLien}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>
                          <a href={`${B}/orga/evenements/${e.id}`}>{e.titre}</a>
                        </p>
                        <p className={s.carteMeta}>
                          <b className={s.montant}>{montant(c.disponible)}</b> à ce jour · virement possible dès le {dateAnnee(e.virementLe!)}
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
                        {v.evenement}
                      </p>
                    </div>
                    <span className={s.masqueDesktop}>
                      <StatutVirement statut={v.statut} />
                    </span>
                  </div>
                  <dl className={s.paires}>
                    <dt>Montant</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{montant(v.montant)}</dd>
                    <dt>Vers</dt>
                    <dd>
                      {v.moyen}
                      <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                        {v.numero}
                      </span>
                    </dd>
                    <dt>Demandé le</dt>
                    <dd>{dateAnnee(v.demande)}</dd>
                    <dt>Traité le</dt>
                    <dd>{v.traite ? dateAnnee(v.traite) : "—"}</dd>
                  </dl>
                  <span className={s.cellule}>
                    <StatutVirement statut={v.statut} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <RubanEtats chemin={`${B}/orga/reversements`} />
    </Coquille>
  );
}
