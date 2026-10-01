import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateAnnee, joursDepuis, montant, nombre } from "@/components/v2/format";
import { formaterNumero } from "@/components/v2/admin/moyens";
import VerificationCompte from "@/components/v2/admin/VerificationCompte";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Organisateurs — Administration — XwézanEvent",
};

const COLS = { "--cols": "minmax(0, 1.8fr) minmax(0, 1.6fr) 110px 120px 150px 140px" } as CSSProperties;
const TRIS = [
  { cle: "ventes", libelle: "Plus de ventes" },
  { cle: "recents", libelle: "Inscrits récemment" },
] as const;

const FILTRES = [
  { cle: "", libelle: "Tous" },
  { cle: "verifies", libelle: "Vérifiés" },
] as const;

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

interface ProfilOrga {
  id: string;
  nom: string;
  nom_public: string | null;
  telephone: string | null;
  created_at: string;
}

interface EventAgrege {
  organisateur_id: string;
  statut: string;
  taux_commission: number;
  ticket_types: { prix: number; quantite_vendue: number }[];
  orders: { total: number; statut: string }[];
}

/** E-mails des comptes (auth.users), lus par pages via service_role. */
async function emailsComptes(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) if (u.email) out.set(u.id, u.email);
    if (data.users.length < 1000) break;
  }
  return out;
}

/**
 * Organisateurs (V2), repris de la preview : recherche, tri, nom public,
 * e-mail, commissions et ce qui attend l'équipe (événements à valider,
 * virements demandés). Ventes et commissions sur les commandes payées, hors
 * événements annulés ou refusés, au taux propre à chaque événement.
 * Comptes vérifiés (labels, artistes auto-produits, design/ARTISTES.md) :
 * badge, filtre, vérifier ou retirer la vérification.
 */
export default async function AdminOrganisateurs({ searchParams }: { searchParams: { q?: string; tri?: string; filtre?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/organisateurs");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const q = (searchParams.q ?? "").trim();
  const tri = TRIS.find((t) => t.cle === searchParams.tri) ?? TRIS[0];
  const filtre = FILTRES.find((f) => f.cle === searchParams.filtre) ?? FILTRES[0];

  // supabaseAdmin : le téléphone de l'organisateur n'est plus lisible via le
  // rôle `authenticated` (migration 20260717140000), les e-mails sont dans
  // auth.users ; le rôle admin est vérifié ci-dessus via la session.
  const [{ data: orgasData }, { data: eventsData }, { data: payoutsData }, emails, { data: verifiesData }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, nom, nom_public, telephone, created_at").eq("role", "organisateur"),
    supabase.from("events").select("organisateur_id, statut, taux_commission, ticket_types(prix, quantite_vendue), orders(total, statut)"),
    supabaseAdmin.from("payouts").select("organisateur_id").eq("statut", "demande"),
    emailsComptes(),
    supabaseAdmin.from("comptes_verifies").select("user_id, verifie_le"),
  ]);
  const verifies = new Map(((verifiesData ?? []) as { user_id: string; verifie_le: string }[]).map((v) => [v.user_id, v.verifie_le]));

  const orgas = (orgasData as ProfilOrga[]) ?? [];
  const evenements = (eventsData as unknown as EventAgrege[]) ?? [];
  const payouts = (payoutsData as { organisateur_id: string }[]) ?? [];

  const lignes = orgas
    .map((o) => {
      const evs = evenements.filter((e) => e.organisateur_id === o.id);
      const comptes = evs.filter((e) => e.statut !== "annule" && e.statut !== "refuse");
      // Ventes et commissions : commandes payées, comme les pages Commissions et Tableau de bord.
      const brutEv = (e: EventAgrege) => e.orders.filter((o) => o.statut === "paye").reduce((n, o) => n + o.total, 0);
      return {
        o,
        email: emails.get(o.id) ?? "",
        tel: o.telephone ? formaterNumero(o.telephone) : null,
        nbEvts: evs.length,
        enVente: evs.filter((e) => e.statut === "publie").length,
        enAttente: evs.filter((e) => e.statut === "en_validation").length,
        vendus: comptes.reduce((n, e) => n + e.ticket_types.reduce((m, t) => m + t.quantite_vendue, 0), 0),
        brut: comptes.reduce((n, e) => n + brutEv(e), 0),
        commission: comptes.reduce((n, e) => n + Math.round(brutEv(e) * e.taux_commission), 0),
        virementsAttente: payouts.filter((p) => p.organisateur_id === o.id).length,
        nouveau: joursDepuis(o.created_at) <= 7,
        verifieLe: verifies.get(o.id) ?? null,
      };
    })
    .filter((l) => filtre.cle !== "verifies" || l.verifieLe !== null)
    .filter((l) => !q || norm(`${l.o.nom} ${l.o.nom_public ?? ""} ${l.email} ${l.o.telephone ?? ""} ${l.tel ?? ""}`).includes(norm(q)))
    .sort((a, b) => (tri.cle === "ventes" ? b.brut - a.brut : b.o.created_at.localeCompare(a.o.created_at)));

  const total = orgas.length;
  const nbVerifies = orgas.filter((o) => verifies.has(o.id)).length;
  const lien = (params: Record<string, string>) => {
    const u = new URLSearchParams({ ...(q ? { q } : {}), ...(tri.cle !== "ventes" ? { tri: tri.cle } : {}), ...(filtre.cle ? { filtre: filtre.cle } : {}), ...params });
    for (const [k, v] of Array.from(u.entries())) if (!v) u.delete(k);
    const str = u.toString();
    return `/admin/organisateurs${str ? `?${str}` : ""}`;
  };

  return (
    <Coquille nav={NAV_ADMIN} actif="organisateurs" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Organisateurs</h1>
          <p className={s.sousTitre}>
            {total} compte{total > 1 ? "s" : ""} organisateur. Le nom personnel n&apos;est jamais affiché publiquement.
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className={s.vide}>
          <Icon name="users" size={32} />
          <p className={s.videTitre}>Aucun organisateur</p>
          <p className={s.videTexte}>Un compte devient organisateur à la soumission de son premier événement.</p>
        </div>
      ) : (
        <>
          <form action="/admin/organisateurs" method="get" className={s.recherche} role="search">
            <Icon name="search" size={20} />
            <input type="search" name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone" aria-label="Rechercher un organisateur" />
            {tri.cle !== "ventes" && <input type="hidden" name="tri" value={tri.cle} />}
            {filtre.cle && <input type="hidden" name="filtre" value={filtre.cle} />}
          </form>
          <div className={s.puces} role="group" aria-label="Filtrer" style={{ marginTop: 12 }}>
            {FILTRES.map((f) => (
              <Link
                key={f.cle || "tous"}
                href={lien({ filtre: f.cle })}
                className={`${s.puce} ${f.cle === filtre.cle ? s.puceOn : ""}`}
                aria-current={f.cle === filtre.cle ? "true" : undefined}
              >
                {f.libelle} <span style={{ opacity: 0.6 }}>{f.cle ? nbVerifies : total}</span>
              </Link>
            ))}
          </div>
          <div className={s.puces} role="group" aria-label="Trier" style={{ margin: "12px 0 16px" }}>
            {TRIS.map((t) => (
              <Link
                key={t.cle}
                href={lien({ tri: t.cle === "ventes" ? "" : t.cle })}
                className={`${s.puce} ${t.cle === tri.cle ? s.puceOn : ""}`}
                aria-current={t.cle === tri.cle ? "true" : undefined}
              >
                {t.libelle}
              </Link>
            ))}
          </div>

          {lignes.length === 0 ? (
            <div className={s.vide}>
              <Icon name="search" size={32} />
              <p className={s.videTitre}>Aucun résultat</p>
              <p className={s.videTexte}>{q ? `Aucun organisateur ne correspond à « ${q} ».` : "Aucun compte vérifié pour l'instant."}</p>
              <Link href={lien({ q: "" })} className={`${s.btn} ${s.btnGris}`}>
                Effacer la recherche
              </Link>
            </div>
          ) : (
            <ul className={s.liste}>
              <li className={s.enteteListe} style={COLS} aria-hidden="true">
                <span>Organisateur</span>
                <span>Contact</span>
                <span>Événements</span>
                <span>Billets</span>
                <span>Ventes</span>
                <span>Commissions</span>
              </li>
              {lignes.map((l) => (
                <li key={l.o.id} className={s.carte} style={{ ...COLS, gap: 8 }}>
                  <div className={s.carteHaut}>
                    <div>
                      <p className={s.carteTitre} style={{ fontSize: 15 }}>
                        {l.o.nom_public || l.o.nom}
                        {l.verifieLe && (
                          <span className={`${s.statut} ${s.stVerifie}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                            Vérifié
                          </span>
                        )}
                        {l.nouveau && (
                          <span className={`${s.statut} ${s.stAttente}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                            Nouveau
                          </span>
                        )}
                      </p>
                      <p className={s.carteMeta}>
                        {l.o.nom_public ? l.o.nom : "Pas de nom public"} · inscrit le {dateAnnee(l.o.created_at)}
                        {l.verifieLe && ` · vérifié le ${dateAnnee(l.verifieLe)}`}
                      </p>
                      {(l.enAttente > 0 || l.virementsAttente > 0) && (
                        <p className={s.carteMeta} style={{ color: "var(--or)" }}>
                          {[l.enAttente > 0 && `${l.enAttente} à valider`, l.virementsAttente > 0 && `${l.virementsAttente} virement${l.virementsAttente > 1 ? "s" : ""} en attente`]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      <div style={{ marginTop: 8, display: "grid" }}>
                        <VerificationCompte userId={l.o.id} nom={l.o.nom_public || l.o.nom} verifieLe={l.verifieLe} />
                      </div>
                    </div>
                  </div>
                  <dl className={s.paires}>
                    <dt>Contact</dt>
                    <dd>
                      {l.email ? (
                        <a href={`mailto:${l.email}`} style={{ textDecoration: "underline" }}>
                          {l.email}
                        </a>
                      ) : (
                        "—"
                      )}
                      <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                        {l.tel ? <a href={`tel:${l.tel.replace(/\s/g, "")}`}>{l.tel}</a> : "Pas de téléphone"}
                      </span>
                    </dd>
                    <dt>Événements</dt>
                    <dd className={s.chiffre}>
                      {l.nbEvts}
                      {l.enVente > 0 && <span className={s.note}> · {l.enVente} en vente</span>}
                    </dd>
                    <dt>Billets</dt>
                    <dd className={s.chiffre}>{nombre(l.vendus)}</dd>
                    <dt>Ventes</dt>
                    <dd className={`${s.montant} ${s.chiffre}`}>{l.brut ? montant(l.brut) : "—"}</dd>
                    <dt>Commissions</dt>
                    <dd className={s.chiffre}>{l.commission ? montant(l.commission) : l.brut ? "0 (offerte)" : "—"}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Coquille>
  );
}
