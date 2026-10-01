import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateCourte, montant, nombre } from "@/components/v2/format";
import { StatutEvt, type Statut } from "@/components/v2/statuts";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Commissions — Administration — XwézanEvent",
};

const VUES = [
  { cle: "", libelle: "Par événement" },
  { cle: "orga", libelle: "Par organisateur" },
] as const;

const COLS = { "--cols": "minmax(0, 2fr) minmax(0, 1.3fr) 150px 90px 150px" } as CSSProperties;
const COLS_ORGA = { "--cols": "minmax(0, 2fr) 110px 170px 170px" } as CSSProperties;
const pct = (x: number) => `${Math.round(x * 1000) / 10}\u00A0%`.replace(".", ",");
const TAUX_DEFAUT = 0.08;

interface EventCommission {
  id: string;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  statut: Statut;
  taux_commission: number;
  organisateur_id: string;
  organisateur: { nom: string; nom_public: string | null } | null;
  orders: { total: number; statut: string }[];
}

/**
 * Commissions (V2), reprises de la preview. Source : commandes payées (ce qui
 * a été encaissé), au taux propre à chaque événement. Les événements annulés
 * et refusés sont exclus : leurs ventes sont à rembourser (bug #7).
 */
export default async function AdminCommissions({ searchParams }: { searchParams: { vue?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/commissions");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const vue = VUES.find((v) => v.cle === searchParams.vue) ?? VUES[0];

  const { data } = await supabase
    .from("events")
    .select("id, titre, date_debut, date_fin, statut, taux_commission, organisateur_id, organisateur:profiles!organisateur_id(nom, nom_public), orders(total, statut)")
    .not("statut", "in", "(annule,refuse)");

  const evs = ((data as unknown as EventCommission[]) ?? [])
    .map((e) => {
      const brut = e.orders.filter((o) => o.statut === "paye").reduce((n, o) => n + o.total, 0);
      return { e, brut, commission: Math.round(brut * e.taux_commission) };
    })
    .filter((x) => x.brut > 0)
    .sort((a, b) => b.commission - a.commission || b.brut - a.brut);
  const ventes = evs.reduce((n, x) => n + x.brut, 0);
  const commissions = evs.reduce((n, x) => n + x.commission, 0);
  const offertes = evs.filter((x) => x.e.taux_commission === 0);
  const manque = offertes.reduce((n, x) => n + Math.round(x.brut * TAUX_DEFAUT), 0);
  const nomOrga = (e: EventCommission) => e.organisateur?.nom_public || e.organisateur?.nom || "—";

  const parOrga = Array.from(
    evs.reduce((m, x) => {
      const l = m.get(x.e.organisateur_id) ?? { nom: nomOrga(x.e), nb: 0, brut: 0, commission: 0 };
      l.nb += 1;
      l.brut += x.brut;
      l.commission += x.commission;
      return m.set(x.e.organisateur_id, l);
    }, new Map<string, { nom: string; nb: number; brut: number; commission: number }>())
  ).sort((a, b) => b[1].commission - a[1].commission);

  return (
    <Coquille nav={NAV_ADMIN} actif="commissions" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
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
              <Link
                key={v.cle}
                href={v.cle ? `/admin/commissions?vue=${v.cle}` : "/admin/commissions"}
                className={`${s.puce} ${v.cle === vue.cle ? s.puceOn : ""}`}
                aria-current={v.cle === vue.cle ? "true" : undefined}
              >
                {v.libelle}
              </Link>
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
              {evs.map(({ e, brut, commission }) => (
                <li key={e.id} className={s.carte} style={{ ...COLS, gap: 8 }}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre} style={{ fontSize: 15 }}>
                        {e.titre}
                      </p>
                      <p className={s.carteMeta}>{dateCourte(e.date_debut, e.date_fin)}</p>
                    </div>
                    <span className={s.masqueDesktop}>
                      <StatutEvt statut={e.statut} />
                    </span>
                  </div>
                  <dl className={s.paires}>
                    <dt>Organisateur</dt>
                    <dd>{nomOrga(e)}</dd>
                    <dt>Ventes</dt>
                    <dd className={s.chiffre}>{montant(brut)}</dd>
                    <dt>Taux</dt>
                    <dd className={s.chiffre}>{e.taux_commission === 0 ? "0\u00A0% (accord)" : pct(e.taux_commission)}</dd>
                    <dt>Commission</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{commission ? montant(commission) : "offerte"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <ul className={s.liste}>
              <li className={s.enteteListe} style={COLS_ORGA} aria-hidden="true">
                <span>Organisateur</span>
                <span>Événements</span>
                <span>Ventes</span>
                <span>Commission</span>
              </li>
              {parOrga.map(([id, l]) => (
                <li key={id} className={s.carte} style={{ ...COLS_ORGA, gap: 8 }}>
                  <div className={s.carteHaut}>
                    <p className={s.carteTitre} style={{ fontSize: 15 }}>
                      {l.nom}
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
    </Coquille>
  );
}
