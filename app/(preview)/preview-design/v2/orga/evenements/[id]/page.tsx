import { notFound } from "next/navigation";
import s from "../../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../../Coquille";
import Icon from "../../../../Icon";
import DemandeVirement from "../../DemandeVirement";
import { Jauge, SqueletteListe, StatutEvt } from "../../ui";
import { COMMISSION, MODIFIABLE, billetsDe, chiffres, dateAnnee, dateCourteOrga, etatPage, evenementOrga, montant, nombre, pourcent } from "../../_orga";
import { Annuler, ListeBillets, LienScan } from "./Interactifs";
import ArtistesEvenement, { type ArtisteFiche } from "./ArtistesEvenement";

/** Artistes à l'affiche (factices) : un de chaque état de rattachement (design/ARTISTES.md, lot 2). */
const ARTISTES_FICHE: ArtisteFiche[] = [
  { id: "a1", nom: "Zeynab Habib", photo: null, statutArtiste: "valide", gere: true, statut: "accepte", le: "20 sept. 2026" },
  { id: "x2", nom: "Sèna Melody", photo: null, statutArtiste: "valide", gere: false, statut: "accepte", le: "22 sept. 2026" },
  { id: "x3", nom: "Kpanlogo Crew", photo: null, statutArtiste: "valide", gere: false, statut: "propose", le: "24 sept. 2026" },
  { id: "x4", nom: "DJ Gbêtô", photo: null, statutArtiste: "valide", gere: false, statut: "refuse", le: "25 sept. 2026" },
];

/**
 * NOUVELLE FONCTIONNALITÉ (pas seulement une refonte) : fiche de gestion d'un
 * événement. En prod, ventes et billets n'existent que comme colonne du
 * dashboard + export CSV. Voir design/PROPOSITIONS.md.
 */
export default function V2FicheEvenement({ params, searchParams }: { params: { id: string }; searchParams: { etat?: string } }) {
  const base = evenementOrga(params.id);
  if (!base) notFound();
  const etat = etatPage(searchParams.etat);
  // ?etat=vide : même événement, aucune vente (état juste après publication).
  const e = etat === "vide" ? { ...base, statut: "publie" as const, tarifs: base.tarifs.map((t) => ({ ...t, vendus: 0 })), scannes: 0, dejaDemande: 0 } : base;
  const c = chiffres(e);
  const billets = billetsDe(e);
  const chemin = `${B}/orga/evenements/${e.id}`;

  return (
    <Coquille actif="accueil">
      <a href={`${B}/orga`} className={s.retour}>
        <Icon name="back" /> Tableau de bord
      </a>
      <div className={s.entete}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <StatutEvt statut={e.statut} />
          </div>
          <h1 className={s.titre}>{e.titre}</h1>
          <p className={s.sousTitre}>
            {dateCourteOrga(e.debut, e.fin)} · {e.heure} · {e.lieu}, {e.ville}
          </p>
        </div>
      </div>

      <div className={s.barreActions}>
        {MODIFIABLE.has(e.statut) && (
          <a href={`${chemin}/modifier`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="edit" /> Modifier
          </a>
        )}
        {e.statut === "publie" && (
          <a href={`${B}/scan`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="qr" /> Scanner
          </a>
        )}
        <a href="#" className={`${s.btn} ${s.btnGris}`}>
          <Icon name="download" /> Exporter CSV
        </a>
        {e.statut === "publie" && (
          <a href={`${B}/evenement`} className={`${s.btn} ${s.btnGris}`}>
            <Icon name="eye" /> Page publique
          </a>
        )}
      </div>

      {etat === "chargement" ? (
        <SqueletteListe n={4} />
      ) : (
        <div className={s.colonnes}>
          <div>
            <section className={`${s.kpis} ${s.kpis3}`} aria-label="Chiffres de l'événement">
              <div className={`${s.kpi} ${s.kpiHeros}`}>
                <span className={s.kpiLabel}>Revenu net</span>
                <span className={s.kpiValeur}>
                  {nombre(c.net)} <small>FCFA</small>
                </span>
                <span className={s.kpiContexte}>
                  {montant(c.brut)} brut, {Math.round(COMMISSION * 100)} % de frais
                </span>
              </div>
              <div className={s.kpi}>
                <span className={s.kpiLabel}>Vendus</span>
                <span className={s.kpiValeur}>{nombre(c.vendus)}</span>
                <span className={s.kpiContexte}>sur {nombre(c.capacite)} places</span>
              </div>
              <div className={s.kpi}>
                <span className={s.kpiLabel}>Entrés</span>
                <span className={s.kpiValeur}>{nombre(e.scannes)}</span>
                <span className={s.kpiContexte}>{e.scannes > 0 ? `${pourcent(e.scannes, Math.max(1, c.vendus))} des billets` : "scan pas encore ouvert"}</span>
              </div>
            </section>

            <h2 className={s.intertitre}>Ventes par tarif</h2>
            <div className={s.panneau}>
              {c.vendus === 0 ? (
                <p className={s.aide}>Aucune vente pour l&apos;instant. Les jauges se rempliront au fil des réservations.</p>
              ) : null}
              <ul className={s.tarifs} style={c.vendus === 0 ? { marginTop: 16 } : undefined}>
                {e.tarifs.map((t) => (
                  <li key={t.nom} className={s.tarifLigne}>
                    <div className={s.tarifTete}>
                      <b>{t.nom}</b>
                      <span className={t.vendus >= t.total ? s.complet : undefined}>
                        {t.vendus >= t.total ? "Complet · " : ""}
                        {t.prix === 0 ? "Gratuit" : montant(t.prix)}
                      </span>
                    </div>
                    <Jauge vendus={t.vendus} total={t.total} neutre={e.statut === "annule" || e.statut === "termine"} />
                  </li>
                ))}
              </ul>
            </div>

          </div>

          <aside>
            <h2 className={s.intertitre}>
              Gestion
            </h2>
            <section className={s.panneau}>
              <h2 className={s.panneauTitre}>Virement</h2>
              {c.disponible > 0 ? (
                <div className={s.pile}>
                  <div>
                    <p className={s.grosMontant}>{montant(c.disponible)}</p>
                    <p className={s.note}>
                      {c.peutDemander ? "disponible maintenant" : `disponible le ${e.virementLe ? dateAnnee(e.virementLe) : "—"}, 3 jours après l'événement`}
                      {e.dejaDemande > 0 ? ` · ${montant(e.dejaDemande)} déjà demandés` : ""}
                    </p>
                  </div>
                  {c.peutDemander && <DemandeVirement titre={e.titre} disponible={c.disponible} peutDemander grand />}
                </div>
              ) : (
                <p className={s.aide}>
                  {e.statut === "annule" ? "Événement annulé : aucun virement possible." : e.dejaDemande > 0 ? "Tout le solde a déjà été demandé." : "Rien à virer pour l'instant."}
                </p>
              )}
            </section>
            {MODIFIABLE.has(e.statut) && <ArtistesEvenement artistes={ARTISTES_FICHE} lienModifier={`${B}/orga/evenements/${e.id}/modifier`} />}
            {e.statut === "publie" && <LienScan initial={e.lienScan} />}
            {MODIFIABLE.has(e.statut) && <Annuler titre={e.titre} />}
          </aside>

          <div className={s.zoneBas}>
            <h2 className={s.intertitre}>Billets</h2>
            <ListeBillets billets={billets} total={c.vendus} />
          </div>
        </div>
      )}

      <RubanEtats chemin={chemin} />
    </Coquille>
  );
}
