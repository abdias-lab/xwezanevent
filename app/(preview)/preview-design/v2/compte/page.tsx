import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import { EVENEMENTS, dateCourte, type Evenement } from "../../_data";
import { AUJOURDHUI } from "../orga/_orga";

export const metadata: Metadata = { title: "Mes billets — XwézanEvent", robots: { index: false } };

type Commande = {
  id: string;
  ev: Evenement;
  billets: string; // résumé « 2 × Pass Standard »
  total: number;
  statut: "paye" | "en_attente" | "rembourse";
  evAnnule?: boolean;
  remboursementLe?: string;
};

const ev = (slug: string) => EVENEMENTS.find((e) => e.slug === slug) ?? EVENEMENTS[0];
const fcfa = (n: number) => (n === 0 ? "Gratuit" : `${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0")}\u00A0FCFA`);

// Commandes de démonstration : à venir, en attente, annulée, passée.
const COMMANDES: Commande[] = [
  { id: "c1", ev: ev(EVENEMENTS[0].slug), billets: "2 × Pass Standard, 1 × Pass VIP", total: 25000, statut: "paye" },
  { id: "c2", ev: ev(EVENEMENTS[1].slug), billets: "2 × Standard", total: 6000, statut: "paye" },
  { id: "c3", ev: ev(EVENEMENTS[6].slug), billets: "2 × Standard", total: 6000, statut: "en_attente" },
  { id: "c4", ev: { ...ev(EVENEMENTS[3].slug), titre: "Brunch musical sur la lagune" }, billets: "2 × Brunch", total: 16000, statut: "paye", evAnnule: true },
  { id: "c5", ev: { ...ev(EVENEMENTS[2].slug), debut: "2026-09-12", fin: undefined, titre: "Afro Nuit Porto-Novo" }, billets: "1 × Entrée", total: 2000, statut: "paye" },
];

const joursAvant = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${AUJOURDHUI}T00:00:00Z`)) / 86400000);
const dans = (d: string) => {
  const n = joursAvant(d);
  return n <= 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`;
};

function Vignette({ e }: { e: Evenement }) {
  return (
    <div style={{ width: 64, height: 64, borderRadius: 4, overflow: "hidden", background: "var(--raised)", flex: "none" }}>
      {e.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.image} alt="" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </div>
  );
}

/**
 * Mon compte (preview V2). En prod : app/(compte)/compte (« Mes billets »).
 * Ajouts : prochain événement mis en avant, paiements en attente séparés
 * (« ne repaie pas »), événements annulés avec l'état du remboursement
 * (BUGS_REFONTE #14), profil. ?etat=vide pour un compte sans billet.
 */
export default function V2Compte({ searchParams }: { searchParams: { etat?: string } }) {
  const commandes = searchParams.etat === "vide" ? [] : COMMANDES;
  const fin = (c: Commande) => c.ev.fin ?? c.ev.debut;
  const annulees = commandes.filter((c) => c.evAnnule);
  const actives = commandes.filter((c) => !c.evAnnule);
  const aVenir = actives.filter((c) => c.statut === "paye" && fin(c) >= AUJOURDHUI).sort((a, b) => a.ev.debut.localeCompare(b.ev.debut));
  const enAttente = actives.filter((c) => c.statut === "en_attente" && fin(c) >= AUJOURDHUI);
  const passees = actives.filter((c) => fin(c) < AUJOURDHUI);
  const [prochain, ...suivants] = aVenir;

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 className={v.h1}>
            Mes <em>billets.</em>
          </h1>
          <p className={v.sous} style={{ margin: "8px 0 24px" }}>
            {commandes.length === 0 ? "Tes billets apparaîtront ici après ton premier achat." : "Compte d'Aïcha Houngbédji."}
          </p>

          {commandes.length === 0 ? (
            <div className={s.vide}>
              <Icon name="ticket" size={32} />
              <p className={s.videTitre}>Aucun billet pour l&apos;instant</p>
              <p className={s.videTexte}>Concerts, festivals, soirées : trouve ta prochaine sortie et réserve en Mobile Money.</p>
              <a href={B} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                Découvrir les événements
              </a>
              <a href={`${B}/billet`} className={s.note} style={{ textDecoration: "underline" }}>
                Tu as acheté sans compte ? Retrouve ton billet
              </a>
            </div>
          ) : (
            <>
              {prochain && (
                <section className={s.billet} aria-labelledby="prochain" style={{ marginBottom: 24 }}>
                  <div className={s.billetHaut}>
                    <span className={s.statut + " " + s.stFort} style={{ justifySelf: "start" }}>
                      Prochain · {dans(prochain.ev.debut)}
                    </span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Vignette e={prochain.ev} />
                      <div>
                        <h2 id="prochain" className={s.billetTitre}>
                          {prochain.ev.titre}
                        </h2>
                        <p className={s.carteMeta}>
                          {dateCourte(prochain.ev)} · {prochain.ev.heure} · {prochain.ev.lieu}, {prochain.ev.ville}
                        </p>
                      </div>
                    </div>
                    <p className={s.carteMeta}>{prochain.billets}</p>
                    <a href={`${B}/confirmation`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                      <Icon name="qr" /> Afficher mes billets
                    </a>
                  </div>
                </section>
              )}

              {enAttente.length > 0 && (
                <Section titre="Paiement en attente">
                  <p className={s.alerte} style={{ marginBottom: 8 }}>
                    <Icon name="clock" />
                    <span>Si tu as validé le paiement sur ton téléphone, ne repaie pas : tes billets arrivent dès que FedaPay confirme.</span>
                  </p>
                  {enAttente.map((c) => (
                    <Ligne key={c.id} c={c} statut={<span className={`${s.statut} ${s.stAttente}`}>En attente</span>}>
                      <a href={`${B}/paiement/retour?etat=attente`} className={`${s.btn} ${s.btnGris}`}>
                        <Icon name="repeat" /> Vérifier
                      </a>
                    </Ligne>
                  ))}
                </Section>
              )}

              {suivants.length > 0 && (
                <Section titre="À venir">
                  {suivants.map((c) => (
                    <Ligne key={c.id} c={c} statut={<span className={s.note}>{dans(c.ev.debut)}</span>}>
                      <a href={`${B}/confirmation?etat=un`} className={`${s.btn} ${s.btnGris}`}>
                        <Icon name="qr" /> Billets
                      </a>
                    </Ligne>
                  ))}
                </Section>
              )}

              {annulees.length > 0 && (
                <Section titre="Événements annulés">
                  {annulees.map((c) => (
                    <Ligne key={c.id} c={c} statut={<span className={`${s.statut} ${s.stBarre}`}>Annulé</span>}>
                      <p className={s.note} style={{ maxWidth: 360 }}>
                        {c.statut === "rembourse"
                          ? `Remboursé le ${c.remboursementLe} sur ton numéro Mobile Money.`
                          : `Tes billets ne sont plus valables. Ton remboursement de ${fcfa(c.total)} arrivera sur ton numéro Mobile Money sous 14 jours. Les fonds sont bloqués : ce remboursement ne dépend pas de l'organisateur.`}
                      </p>
                    </Ligne>
                  ))}
                </Section>
              )}

              {passees.length > 0 && (
                <details style={{ marginTop: 24 }}>
                  <summary className={s.intertitre} style={{ cursor: "pointer", listStyle: "revert" }}>
                    Événements passés ({passees.length})
                  </summary>
                  <ul className={s.pile} style={{ gap: 8, marginTop: 8 }}>
                    {passees.map((c) => (
                      <Ligne key={c.id} c={c} statut={<span className={`${s.statut} ${s.stNeutre}`}>Terminé</span>} />
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          <section className={s.bloc} aria-labelledby="profil" style={{ marginTop: 32 }}>
            <div className={s.blocTete}>
              <Icon name="settings" size={20} />
              <h2 id="profil" className={s.blocTitre}>
                Mon profil
              </h2>
            </div>
            <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
              <dt>Nom</dt>
              <dd>Aïcha Houngbédji</dd>
              <dt>E-mail</dt>
              <dd>aicha.houngbedji@exemple.bj</dd>
              <dt>Téléphone</dt>
              <dd>01 97 42 18 63</dd>
            </dl>
            <div className={s.deux}>
              <a href={`${B}/creer`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                <Icon name="plus" /> Publier un événement
              </a>
              <a href="#" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                <Icon name="logout" /> Se déconnecter
              </a>
            </div>
          </section>
        </div>
        <RubanEtats chemin={`${B}/compte`} etats={["normal", "vide"]} />
      </main>
      <Footer />
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 className={s.intertitre} style={{ marginTop: 0 }}>
        {titre}
      </h2>
      <ul className={s.pile} style={{ gap: 8 }}>
        {children}
      </ul>
    </section>
  );
}

function Ligne({ c, statut, children }: { c: Commande; statut: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className={s.carte}>
      <div className={s.carteHaut} style={{ alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <Vignette e={c.ev} />
          <div style={{ minWidth: 0 }}>
            <p className={s.carteTitre}>{c.ev.titre}</p>
            <p className={s.carteMeta}>
              {dateCourte(c.ev)} · {c.ev.ville} · {c.billets} · {fcfa(c.total)}
            </p>
          </div>
        </div>
        {statut}
      </div>
      {children}
    </li>
  );
}
