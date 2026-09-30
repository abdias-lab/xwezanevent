import type { CSSProperties } from "react";
import s from "../espace.module.css";
import Coquille, { B, RubanEtats } from "../Coquille";
import Icon from "../../Icon";
import Compteur from "./Compteur";
import DemandeVirement from "./DemandeVirement";
import { Jauge, SqueletteListe, StatutEvt } from "./ui";
import { COMMISSION, EVENEMENTS_ORGA, ORGA, chiffres, dateAnnee, dateCourteOrga, etatPage, montant, nombre, pourcent, totaux } from "./_orga";

const COLS = { "--cols": "minmax(0, 2fr) minmax(0, 1.4fr) 128px 132px 200px" } as CSSProperties;

export default function V2Orga({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = etatPage(searchParams.etat);
  const evs = etat === "vide" ? [] : EVENEMENTS_ORGA;
  const t = totaux(evs);
  const aVirer = evs.map((e) => ({ e, c: chiffres(e) })).filter(({ c }) => c.peutDemander && c.disponible > 0);
  const enValidation = evs.filter((e) => e.statut === "en_validation");
  const remplissage = t.capacite > 0 ? Math.round((t.vendus / t.capacite) * 100) : 0;

  return (
    <Coquille actif="accueil">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Bonjour, {ORGA.nom}</h1>
          <p className={s.sousTitre}>Voici comment se portent tes événements.</p>
        </div>
      </div>

      {etat === "chargement" ? (
        <SqueletteListe />
      ) : evs.length === 0 ? (
        <>
          <p className={s.alerte}>
            <Icon name="info" />
            <span>
              Le nom affiché sur tes événements est ton nom personnel. <a href={`${B}/orga/parametres`}>Personnalise-le dans les Paramètres</a>.
            </span>
          </p>
          <div className={s.vide}>
            <Icon name="calendar" size={32} />
            <p className={s.videTitre}>Aucun événement</p>
            <p className={s.videTexte}>Publie ton premier événement pour commencer à vendre des billets. 8 % de commission, uniquement sur les billets vendus.</p>
            <a href={`${B}/creer`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
              <Icon name="plus" /> Créer un événement
            </a>
          </div>
        </>
      ) : (
        <>
          <section className={s.kpis} aria-label="Chiffres clés">
            <div className={`${s.kpi} ${s.kpiHeros}`}>
              <span className={s.kpiLabel}>Revenu net</span>
              <span className={s.kpiValeur}>
                <Compteur valeur={t.net} /> <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>après {Math.round(COMMISSION * 100)} % de frais, tous événements</span>
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
              <span className={s.kpiContexte}>{evs.length} événements au total</span>
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
                {aVirer.map(({ e, c }) => (
                  <li key={e.id} className={`${s.carte} ${s.carteRangee}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>{montant(c.disponible)} à récupérer</p>
                        <p className={s.carteMeta}>{e.titre} · terminé le {dateAnnee(e.debut)}</p>
                      </div>
                    </div>
                    <DemandeVirement titre={e.titre} disponible={c.disponible} peutDemander grand />
                  </li>
                ))}
                {enValidation.map((e) => (
                  <li key={e.id} className={`${s.carte} ${s.carteLien}`}>
                    <div className={s.carteHaut}>
                      <div>
                        <p className={s.carteTitre}>
                          <a href={`${B}/orga/evenements/${e.id}`}>{e.titre}</a>
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
            <a href={`${B}/creer`}>
              <Icon name="plus" /> Nouveau
            </a>
          </h2>
          <ul className={s.liste}>
            <li className={s.enteteListe} style={COLS} aria-hidden="true">
              <span>Événement</span>
              <span>Ventes</span>
              <span>Revenu brut</span>
              <span>Statut</span>
              <span>Action</span>
            </li>
            {evs.map((e) => {
              const c = chiffres(e);
              return (
                <li key={e.id} className={`${s.carte} ${s.carteLien}`} style={COLS}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre}>
                        <a href={`${B}/orga/evenements/${e.id}`}>{e.titre}</a>
                      </p>
                      <p className={s.carteMeta}>
                        {dateCourteOrga(e.debut, e.fin)} · {e.ville}
                      </p>
                    </div>
                    <span className={s.masqueDesktop}>
                      <StatutEvt statut={e.statut} />
                    </span>
                  </div>
                  <div className={s.carteCorps}>
                    <Jauge vendus={c.vendus} total={c.capacite} neutre={e.statut === "annule" || e.statut === "termine"} />
                  </div>
                  <span className={`${s.cellule} ${s.montant} ${s.chiffre}`}>{c.brut > 0 ? montant(c.brut) : "—"}</span>
                  <span className={s.cellule}>
                    <StatutEvt statut={e.statut} />
                  </span>
                  <div className={s.carteBas}>
                    <span className={`${s.montant} ${s.masqueDesktop}`}>{c.brut > 0 ? montant(c.brut) : "Aucune vente"}</span>
                    <ActionLigne id={e.id} titre={e.titre} statut={e.statut} c={c} virementLe={e.virementLe} />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <RubanEtats chemin={`${B}/orga`} />
    </Coquille>
  );
}

/** Une seule action par ligne, la plus utile selon l'état ; le reste est dans la fiche. */
function ActionLigne({ titre, statut, c, virementLe }: { id: string; titre: string; statut: string; c: ReturnType<typeof chiffres>; virementLe?: string }) {
  if (c.disponible > 0 && c.peutDemander) return <DemandeVirement titre={titre} disponible={c.disponible} peutDemander libelle="Virement" />;
  if (statut === "publie")
    return (
      <a href={`${B}/scan`} className={`${s.btn} ${s.btnGris}`}>
        <Icon name="qr" /> Scanner
      </a>
    );
  if (c.disponible > 0 && virementLe) return <span className={s.note}>Virement dès le {dateAnnee(virementLe)}</span>;
  return (
    <span className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      Gérer <Icon name="chevron-right" />
    </span>
  );
}
