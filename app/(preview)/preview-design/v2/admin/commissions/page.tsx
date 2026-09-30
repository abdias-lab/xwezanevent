import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { StatutEvt } from "../../orga/ui";
import { dateCourteOrga, montant, nombre } from "../../orga/_orga";
import { A, EVENEMENTS_ADMIN, NAV_ADMIN, ORGANISATEURS, chiffresAdmin, nomAffiche, organisateur } from "../_admin";

const VUES = [
  { cle: "", libelle: "Par événement" },
  { cle: "orga", libelle: "Par organisateur" },
] as const;

const COLS = { "--cols": "minmax(0, 2fr) minmax(0, 1.3fr) 150px 90px 150px" } as CSSProperties;
const pct = (x: number) => `${Math.round(x * 1000) / 10}\u00A0%`.replace(".", ",");

/**
 * Commissions (preview V2). En prod : app/(admin)/admin/commissions (revenu,
 * taux, commission par événement). Les événements annulés sont exclus : leurs
 * ventes sont à rembourser (bug #7, la prod les compte encore).
 */
export default function V2AdminCommissions({ searchParams }: { searchParams: { vue?: string; etat?: string } }) {
  const vue = VUES.find((v) => v.cle === searchParams.vue) ?? VUES[0];
  const vide = searchParams.etat === "vide";
  const evs = (vide ? [] : EVENEMENTS_ADMIN)
    .filter((e) => e.statut !== "annule" && e.statut !== "refuse")
    .map((e) => ({ e, c: chiffresAdmin(e) }))
    .filter(({ c }) => c.brut > 0)
    .sort((a, b) => b.c.commission - a.c.commission || b.c.brut - a.c.brut);
  const ventes = evs.reduce((n, x) => n + x.c.brut, 0);
  const commissions = evs.reduce((n, x) => n + x.c.commission, 0);
  const offertes = evs.filter((x) => x.e.commission === 0);
  const manque = offertes.reduce((n, x) => n + Math.round(x.c.brut * 0.08), 0);

  const parOrga = ORGANISATEURS.map((o) => {
    const siens = evs.filter((x) => x.e.organisateur === o.id);
    return { o, nb: siens.length, brut: siens.reduce((n, x) => n + x.c.brut, 0), commission: siens.reduce((n, x) => n + x.c.commission, 0) };
  })
    .filter((l) => l.brut > 0)
    .sort((a, b) => b.commission - a.commission);

  return (
    <Coquille nav={NAV_ADMIN} actif="commissions">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Commissions</h1>
          <p className={s.sousTitre}>Ce que la plateforme perçoit sur les ventes, événement par événement.</p>
        </div>
      </div>

      {evs.length === 0 ? (
        <div className={s.vide}>
          <Icon name="percent" size={32} />
          <p className={s.videTitre}>Aucune commission pour l&apos;instant</p>
          <p className={s.videTexte}>Les commissions apparaissent ici dès la première vente payante.</p>
        </div>
      ) : (
        <>
          <section className={`${s.kpis} ${s.kpis3}`} aria-label="Totaux" style={{ marginBottom: 24 }}>
            <div className={`${s.kpi} ${s.kpiHeros}`}>
              <span className={s.kpiLabel}>Commissions perçues</span>
              <span className={s.kpiValeur}>
                {nombre(commissions)} <small>FCFA</small>
              </span>
              <span className={s.kpiContexte}>sur {montant(ventes)} de ventes</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Taux effectif</span>
              <span className={s.kpiValeur}>{pct(commissions / ventes)}</span>
              <span className={s.kpiContexte}>8 % par défaut</span>
            </div>
            <div className={s.kpi}>
              <span className={s.kpiLabel}>Offertes</span>
              <span className={s.kpiValeur}>{offertes.length}</span>
              <span className={s.kpiContexte}>{manque ? `${montant(manque)} non perçus` : "aucun accord en cours"}</span>
            </div>
          </section>

          <div className={s.puces} role="group" aria-label="Regrouper" style={{ marginBottom: 16 }}>
            {VUES.map((v) => (
              <a
                key={v.cle}
                href={v.cle ? `${A}/commissions?vue=${v.cle}` : `${A}/commissions`}
                className={`${s.puce} ${v.cle === vue.cle ? s.puceOn : ""}`}
                aria-current={v.cle === vue.cle ? "true" : undefined}
              >
                {v.libelle}
              </a>
            ))}
          </div>

          {vue.cle === "" ? (
            <ul className={s.liste}>
              <li className={s.enteteListe} style={COLS} aria-hidden="true">
                <span>Événement</span>
                <span>Organisateur</span>
                <span>Ventes</span>
                <span>Taux</span>
                <span>Commission</span>
              </li>
              {evs.map(({ e, c }) => (
                <li key={e.id} className={s.carte} style={{ ...COLS, gap: 8 }}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre} style={{ fontSize: 15 }}>
                        {e.titre}
                      </p>
                      <p className={s.carteMeta}>{dateCourteOrga(e.debut, e.fin)}</p>
                    </div>
                    <span className={s.masqueDesktop}>
                      <StatutEvt statut={e.statut} />
                    </span>
                  </div>
                  <dl className={s.paires}>
                    <dt>Organisateur</dt>
                    <dd>{nomAffiche(organisateur(e.organisateur))}</dd>
                    <dt>Ventes</dt>
                    <dd className={s.chiffre}>{montant(c.brut)}</dd>
                    <dt>Taux</dt>
                    <dd className={s.chiffre}>{e.commission === 0 ? "0\u00A0% (accord)" : pct(e.commission)}</dd>
                    <dt>Commission</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{c.commission ? montant(c.commission) : "offerte"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={s.liste}>
              <li className={s.enteteListe} style={{ "--cols": "minmax(0, 2fr) 110px 170px 170px" } as CSSProperties} aria-hidden="true">
                <span>Organisateur</span>
                <span>Événements</span>
                <span>Ventes</span>
                <span>Commission</span>
              </li>
              {parOrga.map((l) => (
                <li key={l.o.id} className={s.carte} style={{ "--cols": "minmax(0, 2fr) 110px 170px 170px", gap: 8 } as CSSProperties}>
                  <div className={s.carteHaut}>
                    <p className={s.carteTitre} style={{ fontSize: 15 }}>
                      {nomAffiche(l.o)}
                    </p>
                  </div>
                  <dl className={s.paires}>
                    <dt>Événements</dt>
                    <dd className={s.chiffre}>{l.nb}</dd>
                    <dt>Ventes</dt>
                    <dd className={s.chiffre}>{montant(l.brut)}</dd>
                    <dt>Commission</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{l.commission ? montant(l.commission) : "offerte"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
          <p className={s.note} style={{ marginTop: 12 }}>
            Les événements annulés sont exclus : leurs ventes sont à rembourser (voir Billets et remboursements).
          </p>
        </>
      )}

      <RubanEtats chemin={`${A}/commissions`} etats={["normal", "vide"]} />
    </Coquille>
  );
}
