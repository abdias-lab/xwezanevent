import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { SqueletteListe } from "../../orga/ui";
import { dateAnnee, etatPage, montant, nombre } from "../../orga/_orga";
import { A, EVENEMENTS_ADMIN, NAV_ADMIN, ORGANISATEURS, VIREMENTS_ADMIN, chiffresAdmin, joursDepuis } from "../_admin";

const COLS = { "--cols": "minmax(0, 1.8fr) minmax(0, 1.6fr) 110px 120px 150px 140px" } as CSSProperties;
const TRIS = [
  { cle: "ventes", libelle: "Plus de ventes" },
  { cle: "recents", libelle: "Inscrits récemment" },
] as const;

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Organisateurs (preview V2). En prod : app/(admin)/admin/organisateurs
 * (nom, téléphone, événements, billets vendus, revenu généré). Ajouts V2 :
 * recherche, tri, nom public, e-mail, commissions et virements en attente.
 */
export default function V2AdminOrganisateurs({ searchParams }: { searchParams: { q?: string; tri?: string; etat?: string } }) {
  const etat = etatPage(searchParams.etat);
  const q = (searchParams.q ?? "").trim();
  const tri = TRIS.find((t) => t.cle === searchParams.tri) ?? TRIS[0];

  const lignes = (etat === "vide" ? [] : ORGANISATEURS)
    .map((o) => {
      const evs = EVENEMENTS_ADMIN.filter((e) => e.organisateur === o.id);
      const c = evs.filter((e) => e.statut !== "annule" && e.statut !== "refuse").map(chiffresAdmin);
      return {
        o,
        nbEvts: evs.length,
        enVente: evs.filter((e) => e.statut === "publie").length,
        enAttente: evs.filter((e) => e.statut === "en_validation").length,
        vendus: c.reduce((n, x) => n + x.vendus, 0),
        brut: c.reduce((n, x) => n + x.brut, 0),
        commission: c.reduce((n, x) => n + x.commission, 0),
        virementsAttente: VIREMENTS_ADMIN.filter((v) => v.organisateur === o.id && v.statut === "demande").length,
        nouveau: joursDepuis(o.inscritLe) <= 7,
      };
    })
    .filter(({ o }) => !q || norm(`${o.nom} ${o.nomPublic ?? ""} ${o.email} ${o.tel}`).includes(norm(q)))
    .sort((a, b) => (tri.cle === "ventes" ? b.brut - a.brut : b.o.inscritLe.localeCompare(a.o.inscritLe)));

  const total = etat === "vide" ? 0 : ORGANISATEURS.length;
  const lien = (params: Record<string, string>) => {
    const u = new URLSearchParams({ ...(q ? { q } : {}), ...(tri.cle !== "ventes" ? { tri: tri.cle } : {}), ...params });
    for (const [k, v] of Array.from(u.entries())) if (!v) u.delete(k);
    const str = u.toString();
    return `${A}/organisateurs${str ? `?${str}` : ""}`;
  };

  return (
    <Coquille nav={NAV_ADMIN} actif="organisateurs">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Organisateurs</h1>
          <p className={s.sousTitre}>
            {total} compte{total > 1 ? "s" : ""} organisateur. Le nom personnel n&apos;est jamais affiché publiquement.
          </p>
        </div>
      </div>

      {etat === "chargement" ? (
        <SqueletteListe kpis={false} />
      ) : total === 0 ? (
        <div className={s.vide}>
          <Icon name="users" size={32} />
          <p className={s.videTitre}>Aucun organisateur</p>
          <p className={s.videTexte}>Un compte devient organisateur à la soumission de son premier événement.</p>
        </div>
      ) : (
        <>
          <form action={`${A}/organisateurs`} method="get" className={s.recherche} role="search">
            <Icon name="search" size={20} />
            <input type="search" name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone" aria-label="Rechercher un organisateur" />
            {tri.cle !== "ventes" && <input type="hidden" name="tri" value={tri.cle} />}
          </form>
          <div className={s.puces} role="group" aria-label="Trier" style={{ margin: "12px 0 16px" }}>
            {TRIS.map((t) => (
              <a
                key={t.cle}
                href={lien({ tri: t.cle === "ventes" ? "" : t.cle })}
                className={`${s.puce} ${t.cle === tri.cle ? s.puceOn : ""}`}
                aria-current={t.cle === tri.cle ? "true" : undefined}
              >
                {t.libelle}
              </a>
            ))}
          </div>

          {lignes.length === 0 ? (
            <div className={s.vide}>
              <Icon name="search" size={32} />
              <p className={s.videTitre}>Aucun résultat</p>
              <p className={s.videTexte}>Aucun organisateur ne correspond à « {q} ».</p>
              <a href={lien({ q: "" })} className={`${s.btn} ${s.btnGris}`}>
                Effacer la recherche
              </a>
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
                        {l.o.nomPublic ?? l.o.nom}
                        {l.nouveau && (
                          <span className={`${s.statut} ${s.stAttente}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                            Nouveau
                          </span>
                        )}
                      </p>
                      <p className={s.carteMeta}>
                        {l.o.nomPublic ? l.o.nom : "Pas de nom public"} · inscrit le {dateAnnee(l.o.inscritLe)}
                      </p>
                      {(l.enAttente > 0 || l.virementsAttente > 0) && (
                        <p className={s.carteMeta} style={{ color: "var(--or)" }}>
                          {[l.enAttente > 0 && `${l.enAttente} à valider`, l.virementsAttente > 0 && `${l.virementsAttente} virement${l.virementsAttente > 1 ? "s" : ""} en attente`].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <dl className={s.paires}>
                    <dt>Contact</dt>
                    <dd>
                      <a href={`mailto:${l.o.email}`} style={{ textDecoration: "underline" }}>
                        {l.o.email}
                      </a>
                      <span className={`${s.note} ${s.chiffre}`} style={{ display: "block" }}>
                        <a href={`tel:${l.o.tel.replace(/\s/g, "")}`}>{l.o.tel}</a>
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

      <RubanEtats chemin={`${A}/organisateurs`} />
    </Coquille>
  );
}
