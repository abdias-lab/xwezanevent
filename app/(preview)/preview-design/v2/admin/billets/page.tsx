import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { StatutBillet } from "../../orga/ui";
import { dateAnnee, montant } from "../../orga/_orga";
import { A, BILLETS_ADMIN, EVENEMENTS_ADMIN, NAV_ADMIN, evenementAdmin, type BilletAdmin } from "../_admin";
import Remboursements, { type CommandeARembourser } from "./Remboursements";

const FILTRES = [
  { cle: "", libelle: "Tous" },
  { cle: "valide", libelle: "Valides" },
  { cle: "utilise", libelle: "Utilisés" },
  { cle: "annule", libelle: "Annulés" },
  { cle: "rembourser", libelle: "À rembourser" },
] as const;

const COLS = { "--cols": "minmax(0, 1.6fr) minmax(0, 1.5fr) minmax(0, 1.6fr) 110px 120px" } as CSSProperties;
const LIMITE = 200; // comme LIMITE en prod
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const dateHeure = (d: string) => `${dateAnnee(d.slice(0, 10))} · ${d.slice(11, 16)}`;

/**
 * Billets et remboursements (preview V2). En prod : app/(admin)/admin/billets.
 * Corrige l'affichage des acheteurs invités (bug #6) et ajoute le suivi des
 * remboursements (bug #7). Filtres en GET : fonctionnent sans JavaScript.
 */
export default function V2AdminBillets({ searchParams }: { searchParams: { event?: string; statut?: string; q?: string; etat?: string } }) {
  const vide = searchParams.etat === "vide";
  const evt = searchParams.event ?? "";
  const statut = FILTRES.find((f) => f.cle === searchParams.statut) ?? FILTRES[0];
  const q = (searchParams.q ?? "").trim();
  const base = vide ? [] : BILLETS_ADMIN.filter((b) => !evt || b.evenement === evt);
  const aRembourser = base.filter((b) => b.statut === "annule" && !b.rembourse);

  const compte = (cle: string) => (cle === "rembourser" ? new Set(aRembourser.map((b) => b.commande)).size : base.filter((b) => !cle || b.statut === cle).length);
  const lien = (p: Record<string, string>) => {
    const u = new URLSearchParams(Object.entries({ event: evt, statut: statut.cle, q, ...p }).filter(([, v]) => v) as [string, string][]);
    return `${A}/billets${u.toString() ? `?${u}` : ""}`;
  };

  const liste = base
    .filter((b) => statut.cle === "" || b.statut === statut.cle)
    .filter((b) => !q || norm(`${b.nom} ${b.tel} ${b.email} ${b.ref}`).includes(norm(q)))
    .sort((a, b) => b.acheteLe.localeCompare(a.acheteLe))
    .slice(0, LIMITE);

  // Remboursement par commande (orders.statut), pas par billet.
  const parCommande = new Map<string, CommandeARembourser>();
  for (const b of aRembourser) {
    const c = parCommande.get(b.commande);
    if (c) {
      c.billets += 1;
      c.total += b.prix;
    } else
      parCommande.set(b.commande, { commande: b.commande, nom: b.nom, tel: b.tel, email: b.email, invite: b.invite, evenement: evenementAdmin(b.evenement)!.titre, billets: 1, total: b.prix });
  }
  const commandes = Array.from(parCommande.values()).filter((c) => !q || norm(`${c.nom} ${c.tel} ${c.email}`).includes(norm(q)));
  const evenementsVendus = EVENEMENTS_ADMIN.filter((e) => BILLETS_ADMIN.some((b) => b.evenement === e.id));

  return (
    <Coquille nav={NAV_ADMIN} actif="billets">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Billets et remboursements</h1>
          <p className={s.sousTitre}>Retrouver un acheteur, et rembourser ceux des événements annulés.</p>
        </div>
      </div>

      <form action={`${A}/billets`} method="get" style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div className={s.recherche} role="search">
          <Icon name="search" size={20} />
          <input type="search" name="q" defaultValue={q} placeholder="Nom, téléphone, e-mail ou référence" aria-label="Rechercher un billet" />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className={s.champ} style={{ flex: 1 }}>
            <label htmlFor="event" className={s.srOnly}>
              Événement
            </label>
            <select id="event" name="event" defaultValue={evt}>
              <option value="">Tous les événements</option>
              {evenementsVendus.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titre}
                </option>
              ))}
            </select>
          </div>
          {statut.cle && <input type="hidden" name="statut" value={statut.cle} />}
          <button type="submit" className={`${s.btn} ${s.btnGris}`} style={{ height: 48 }}>
            Filtrer
          </button>
        </div>
      </form>

      <div className={s.puces} role="group" aria-label="Filtrer par statut" style={{ marginBottom: 16 }}>
        {FILTRES.map((f) => (
          <a key={f.cle} href={lien({ statut: f.cle })} className={`${s.puce} ${f.cle === statut.cle ? s.puceOn : ""}`} aria-current={f.cle === statut.cle ? "true" : undefined}>
            {f.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{compte(f.cle)}</span>
          </a>
        ))}
      </div>

      {evt && statut.cle !== "rembourser" && (
        <p style={{ marginBottom: 12 }}>
          <a href="#" className={`${s.btn} ${s.btnGris}`}>
            <Icon name="download" /> Exporter les billets de cet événement (CSV)
          </a>
        </p>
      )}

      {statut.cle === "rembourser" ? (
        commandes.length === 0 ? (
          <div className={s.vide}>
            <Icon name="check" size={32} />
            <p className={s.videTitre}>Aucun remboursement en attente</p>
            <p className={s.videTexte}>Les commandes payées d&apos;un événement annulé apparaissent ici jusqu&apos;à leur remboursement.</p>
          </div>
        ) : (
          <Remboursements commandes={commandes} />
        )
      ) : liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="ticket" size={32} />
          <p className={s.videTitre}>{q ? "Aucun résultat" : "Aucun billet"}</p>
          <p className={s.videTexte}>{q ? `Aucun billet ne correspond à « ${q} ».` : "Les billets apparaîtront ici dès la première vente."}</p>
        </div>
      ) : (
        <>
          <ul className={s.liste}>
            <li className={s.enteteListe} style={COLS} aria-hidden="true">
              <span>Acheteur</span>
              <span>Contact</span>
              <span>Événement</span>
              <span>Statut</span>
              <span>Acheté le</span>
            </li>
            {liste.map((b) => (
              <Ligne key={b.ref} b={b} />
            ))}
          </ul>
          <p className={s.note} style={{ marginTop: 8 }}>
            {liste.length} billet{liste.length > 1 ? "s" : ""} affiché{liste.length > 1 ? "s" : ""}, les plus récents d&apos;abord ({LIMITE} au maximum).
          </p>
        </>
      )}

      <RubanEtats chemin={`${A}/billets`} etats={["normal", "vide"]} />
    </Coquille>
  );
}

function Ligne({ b }: { b: BilletAdmin }) {
  return (
    <li className={s.carte} style={{ ...COLS, gap: 8 }}>
      <div className={s.carteHaut}>
        <div>
          <p className={s.carteTitre} style={{ fontSize: 15 }}>
            {b.nom}
            {b.invite && (
              <span className={`${s.statut} ${s.stNeutre}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                Invité
              </span>
            )}
          </p>
          <p className={`${s.carteMeta} ${s.chiffre}`}>{b.ref}</p>
        </div>
        <span className={s.masqueDesktop}>
          <StatutBillet statut={b.statut} />
        </span>
      </div>
      <dl className={s.paires}>
        <dt>Contact</dt>
        <dd>
          <span className={s.chiffre}>{b.tel}</span>
          <span className={s.note} style={{ display: "block" }}>
            {b.email}
          </span>
        </dd>
        <dt>Événement</dt>
        <dd>
          {evenementAdmin(b.evenement)!.titre}
          <span className={s.note} style={{ display: "block" }}>
            {b.tarif} · {b.prix ? montant(b.prix) : "gratuit"}
            {b.rembourse ? " · remboursé" : ""}
          </span>
        </dd>
        <dt>Acheté le</dt>
        <dd className={s.masqueDesktop}>{dateHeure(b.acheteLe)}</dd>
      </dl>
      <span className={s.cellule}>
        <StatutBillet statut={b.statut} />
      </span>
      <span className={s.cellule} style={{ fontSize: 13 }}>
        {dateHeure(b.acheteLe)}
      </span>
    </li>
  );
}
