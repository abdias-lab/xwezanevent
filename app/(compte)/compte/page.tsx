import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { aujourdhuiPortoNovo } from "@/lib/date";
import { formaterNumero } from "@/lib/telephone";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Icon from "@/components/v2/Icon";
import Deconnexion from "@/components/v2/Deconnexion";
import { dateAnnee } from "@/components/v2/format";
import { dateCarte, fcfa } from "@/components/v2/public/evenement";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Mes billets — XwézanEvent", robots: { index: false } };

// Même seuil que /api/orders (FENETRE_REUTILISATION_MS) : au-delà, une
// commande en_attente est abandonnée (paiement jamais validé ou expiré) et
// n'est plus présentée comme « en attente ».
const ATTENTE_MAX_MS = 30 * 60 * 1000;

type Commande = {
  id: string;
  titre: string;
  debut: string;
  fin: string | null;
  heure: string | null;
  lieu: string;
  ville: string;
  image: string | null;
  billets: string; // résumé « 2 × Pass Standard »
  total: number;
  statut: string;
  creeeLe: string;
  majLe: string;
  evAnnule: boolean;
};

interface OrderRow {
  id: string;
  total: number;
  statut: string;
  created_at: string;
  updated_at: string;
  event_id: string;
  // Snapshot de la sélection (20260709120000_orders_panier.sql) : seul résumé
  // possible tant que la commande n'est pas payée (billets créés au paiement).
  panier: { nom: string; quantite: number }[] | null;
  tickets: { ticket_type_id: string }[];
}

function Vignette({ image }: { image: string | null }) {
  return (
    <div style={{ width: 64, height: 64, borderRadius: 4, overflow: "hidden", background: "var(--raised)", flex: "none" }}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
    </div>
  );
}

/** « Compte d'Aïcha » / « Compte de Codjo ». */
function compteDe(nom: string) {
  return /^[aeiouyàâäéèêëîïôöùûü]/i.test(nom) ? `Compte d'${nom}.` : `Compte de ${nom}.`;
}

/**
 * Mes billets (V2), repris de la preview (v2/compte). Prochain événement mis
 * en avant, paiements en attente séparés (« ne repaie pas »), événements
 * annulés avec l'état du remboursement (BUGS_REFONTE n°14), profil.
 */
export default async function Compte() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");

  // Commandes de l'utilisateur (client de session + filtre explicite : la RLS
  // laisse aussi un organisateur lire les commandes de ses événements).
  const [{ data: ordersData }, { data: profil }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, statut, created_at, updated_at, event_id, panier, tickets(ticket_type_id)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("nom, telephone").eq("id", user.id).maybeSingle(),
  ]);
  const orders = (ordersData as unknown as OrderRow[] | null) ?? [];

  // Événements et tarifs de CES commandes, via supabaseAdmin : la RLS ne laisse
  // lire au public que les événements publiés ou terminés, un événement annulé
  // disparaissait donc de la page. Seuls les champs d'affichage sont lus.
  const idsEv = Array.from(new Set(orders.map((o) => o.event_id)));
  const idsTarifs = Array.from(new Set(orders.flatMap((o) => o.tickets.map((t) => t.ticket_type_id))));
  const [{ data: evData }, { data: tarifsData }] = await Promise.all([
    idsEv.length
      ? supabaseAdmin.from("events").select("id, titre, date_debut, date_fin, heure, lieu, ville, affiche_url, statut").in("id", idsEv)
      : Promise.resolve({ data: [] }),
    idsTarifs.length ? supabaseAdmin.from("ticket_types").select("id, nom").in("id", idsTarifs) : Promise.resolve({ data: [] }),
  ]);
  const evenements = new Map((evData ?? []).map((e) => [e.id as string, e]));
  const nomsTarifs = new Map((tarifsData ?? []).map((t) => [t.id as string, t.nom as string]));

  const toutes: Commande[] = [];
  for (const o of orders) {
    const e = evenements.get(o.event_id);
    if (!e) continue;
    const compte = new Map<string, number>();
    for (const t of o.tickets) {
      const nom = nomsTarifs.get(t.ticket_type_id) ?? "Billet";
      compte.set(nom, (compte.get(nom) ?? 0) + 1);
    }
    if (o.tickets.length === 0) for (const p of o.panier ?? []) compte.set(p.nom, (compte.get(p.nom) ?? 0) + p.quantite);
    toutes.push({
      id: o.id,
      titre: e.titre,
      debut: e.date_debut,
      fin: e.date_fin,
      heure: e.heure ? String(e.heure).slice(0, 5) : null,
      lieu: e.lieu,
      ville: e.ville,
      image: e.affiche_url,
      billets: Array.from(compte, ([nom, n]) => `${n} × ${nom}`).join(", "),
      total: o.total,
      statut: o.statut,
      creeeLe: o.created_at,
      majLe: o.updated_at,
      evAnnule: e.statut === "annule",
    });
  }

  const aujourdhui = aujourdhuiPortoNovo();
  const maintenant = Date.now();
  const fin = (c: Commande) => c.fin ?? c.debut;
  const joursAvant = (d: string) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86400000);
  const dans = (d: string) => {
    const n = joursAvant(d);
    return n <= 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`;
  };

  // Commandes échouées ou abandonnées : jamais affichées (aucun billet).
  const annulees = toutes.filter((c) => c.evAnnule && (c.statut === "paye" || c.statut === "rembourse"));
  const actives = toutes.filter((c) => !c.evAnnule);
  const aVenir = actives.filter((c) => c.statut === "paye" && fin(c) >= aujourdhui).sort((a, b) => a.debut.localeCompare(b.debut));
  const enAttente = actives.filter((c) => c.statut === "en_attente" && fin(c) >= aujourdhui && maintenant - Date.parse(c.creeeLe) < ATTENTE_MAX_MS);
  // Passés, et remboursements hors annulation (remboursement exceptionnel, fait à la main).
  const passees = actives.filter((c) => (c.statut === "paye" && fin(c) < aujourdhui) || c.statut === "rembourse");
  const affichees = annulees.length + aVenir.length + enAttente.length + passees.length;
  const [prochain, ...suivants] = aVenir;

  const nom = profil?.nom || user.email || "";
  const meta = (c: Commande) => `${dateCarte({ debut: c.debut, fin: c.fin ?? undefined })} · ${c.ville} · ${c.billets} · ${fcfa(c.total)}`;

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 className={v.h1}>
            Mes <em>billets.</em>
          </h1>
          <p className={v.sous} style={{ margin: "8px 0 24px" }}>
            {affichees === 0 ? "Tes billets apparaîtront ici après ton premier achat." : compteDe(nom)}
          </p>

          {affichees === 0 ? (
            <div className={s.vide}>
              <Icon name="ticket" size={32} />
              <p className={s.videTitre}>Aucun billet pour l&apos;instant</p>
              <p className={s.videTexte}>Concerts, festivals, soirées : trouve ta prochaine sortie et réserve en Mobile Money.</p>
              <Link href="/" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                Découvrir les événements
              </Link>
              <Link href="/billet" className={s.note} style={{ textDecoration: "underline" }}>
                Tu as acheté sans compte ? Retrouve ton billet
              </Link>
            </div>
          ) : (
            <>
              {prochain && (
                <section className={s.billet} aria-labelledby="prochain" style={{ marginBottom: 24 }}>
                  <div className={s.billetHaut}>
                    <span className={s.statut + " " + s.stFort} style={{ justifySelf: "start" }}>
                      Prochain · {dans(prochain.debut)}
                    </span>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <Vignette image={prochain.image} />
                      <div>
                        <h2 id="prochain" className={s.billetTitre}>
                          {prochain.titre}
                        </h2>
                        <p className={s.carteMeta}>
                          {dateCarte({ debut: prochain.debut, fin: prochain.fin ?? undefined })}
                          {prochain.heure ? ` · ${prochain.heure}` : ""} · {prochain.lieu}, {prochain.ville}
                        </p>
                      </div>
                    </div>
                    <p className={s.carteMeta}>{prochain.billets}</p>
                    <Link href={`/confirmation?order=${prochain.id}`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                      <Icon name="qr" /> Afficher mes billets
                    </Link>
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
                    <Ligne key={c.id} c={c} meta={meta(c)} statut={<span className={`${s.statut} ${s.stAttente}`}>En attente</span>}>
                      <Link href={`/paiement/retour?order=${c.id}`} className={`${s.btn} ${s.btnGris}`}>
                        <Icon name="repeat" /> Vérifier
                      </Link>
                    </Ligne>
                  ))}
                </Section>
              )}

              {suivants.length > 0 && (
                <Section titre="À venir">
                  {suivants.map((c) => (
                    <Ligne key={c.id} c={c} meta={meta(c)} statut={<span className={s.note}>{dans(c.debut)}</span>}>
                      <Link href={`/confirmation?order=${c.id}`} className={`${s.btn} ${s.btnGris}`}>
                        <Icon name="qr" /> Billets
                      </Link>
                    </Ligne>
                  ))}
                </Section>
              )}

              {annulees.length > 0 && (
                <Section titre="Événements annulés">
                  {annulees.map((c) => (
                    <Ligne key={c.id} c={c} meta={meta(c)} statut={<span className={`${s.statut} ${s.stBarre}`}>Annulé</span>}>
                      <p className={s.note} style={{ maxWidth: 360 }}>
                        {c.statut === "rembourse"
                          ? `Remboursé le ${dateAnnee(c.majLe)} sur ton numéro Mobile Money.`
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
                      <Ligne
                        key={c.id}
                        c={c}
                        meta={meta(c)}
                        statut={<span className={`${s.statut} ${s.stNeutre}`}>{c.statut === "rembourse" ? "Remboursé" : "Terminé"}</span>}
                      />
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
              <dd>{profil?.nom || "—"}</dd>
              <dt>E-mail</dt>
              <dd>{user.email}</dd>
              <dt>Téléphone</dt>
              <dd>{profil?.telephone ? formaterNumero(profil.telephone) : "—"}</dd>
            </dl>
            <div className={s.deux}>
              <Link href="/creer" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                <Icon name="plus" /> Publier un événement
              </Link>
              <Deconnexion className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} />
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: ReactNode }) {
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

function Ligne({ c, meta, statut, children }: { c: Commande; meta: string; statut: ReactNode; children?: ReactNode }) {
  return (
    <li className={s.carte}>
      <div className={s.carteHaut} style={{ alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
          <Vignette image={c.image} />
          <div style={{ minWidth: 0 }}>
            <p className={s.carteTitre}>{c.titre}</p>
            <p className={s.carteMeta}>{meta}</p>
          </div>
        </div>
        {statut}
      </div>
      {children}
    </li>
  );
}
