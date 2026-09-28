"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { montant, nombre } from "../format";
import { StatutEvt, type Statut } from "../statuts";

export type EvenementGere = {
  id: string;
  titre: string;
  quand: string; // « 13–15 nov. · Cotonou »
  motifRefus: string | null;
  statut: Statut;
  organisateur: string;
  vendus: number;
  capacite: number;
  brut: number;
  aLaUne: boolean;
};

const COLS = { "--cols": "minmax(0, 1.8fr) minmax(0, 1fr) 100px 130px 110px minmax(0, 1.7fr)" } as CSSProperties;

/** POST sur une route admin ; renvoie le message d'erreur, ou null si c'est fait. */
async function appeler(url: string, corps: object): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? "Erreur";
  } catch {
    return "Erreur réseau";
  }
}

/**
 * Liste des événements hors validation (V2), reprise de la preview
 * (app/(preview)/preview-design/v2/admin/evenements/page.tsx + Gestion.tsx).
 * Un événement annulé ou supprimé reste affiché à sa place avec son nouvel
 * état ; la page serveur est rafraîchie aussitôt pour que les compteurs des
 * puces soient justes (même règle que les virements).
 */
export default function ListeGestion({ evenements }: { evenements: EvenementGere[] }) {
  const router = useRouter();
  const [gardes, setGardes] = useState<Record<string, { vue: EvenementGere; index: number; etat: Statut | "supprime" }>>({});

  const affiches = useMemo(() => {
    const liste = [...evenements];
    for (const g of Object.values(gardes).sort((a, b) => a.index - b.index)) {
      if (!liste.some((e) => e.id === g.vue.id)) liste.splice(Math.min(g.index, liste.length), 0, g.vue);
    }
    return liste;
  }, [evenements, gardes]);

  function changer(e: EvenementGere, etat: Statut | "supprime") {
    const index = affiches.findIndex((x) => x.id === e.id);
    setGardes((p) => ({ ...p, [e.id]: { vue: e, index, etat } }));
    router.refresh();
  }

  return (
    <ul className={s.liste}>
      <li className={s.enteteListe} style={COLS} aria-hidden="true">
        <span>Événement</span>
        <span>Organisateur</span>
        <span>Vendus</span>
        <span>Ventes</span>
        <span>Statut</span>
        <span>Actions</span>
      </li>
      {affiches.map((e) => (
        <li key={e.id} className={s.carte} style={COLS}>
          <div className={s.carteHaut}>
            <div>
              <p className={s.carteTitre}>{e.titre}</p>
              <p className={s.carteMeta}>{e.quand}</p>
              {e.motifRefus && <p className={s.carteMeta}>Motif : {e.motifRefus}</p>}
            </div>
            <span className={s.masqueDesktop}>
              <StatutEvt statut={e.statut} />
            </span>
          </div>
          <dl className={s.paires}>
            <dt>Organisateur</dt>
            <dd>{e.organisateur}</dd>
            <dt>Vendus</dt>
            <dd className={s.chiffre}>
              {nombre(e.vendus)} / {nombre(e.capacite)}
            </dd>
            <dt>Ventes</dt>
            <dd className={s.chiffre}>{e.brut ? montant(e.brut) : "—"}</dd>
          </dl>
          <span className={s.cellule}>
            <StatutEvt statut={e.statut} />
          </span>
          <Gestion e={e} etatGarde={gardes[e.id]?.etat} onChange={(etat) => changer(e, etat)} onRafraichir={() => router.refresh()} />
        </li>
      ))}
    </ul>
  );
}

type Action = "annuler" | "supprimer";

/**
 * Actions d'un événement. Mêmes règles que la prod (routes
 * /api/admin/events/[id]/mettre-en-avant, /annuler, /supprimer, qui les
 * revérifient) : à la une seulement « en vente » ; annuler tout statut sauf
 * « annulé » ; supprimer seulement si aucun billet n'a été vendu.
 */
function Gestion({
  e,
  etatGarde,
  onChange,
  onRafraichir,
}: {
  e: EvenementGere;
  etatGarde?: Statut | "supprime";
  onChange: (etat: Statut | "supprime") => void;
  onRafraichir: () => void;
}) {
  const etat = etatGarde ?? e.statut;
  const [aLaUne, setALaUne] = useState(e.aLaUne);
  const [modale, setModale] = useState<Action | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  if (etat === "supprime") return <span className={s.note}>Supprimé</span>;

  async function basculerUne() {
    const suivant = !aLaUne;
    setEnCours(true);
    setErreur(null);
    const err = await appeler(`/api/admin/events/${e.id}/mettre-en-avant`, { misEnAvant: suivant, ordreAffiche: null });
    setEnCours(false);
    if (err) return setErreur(err);
    setALaUne(suivant);
    onRafraichir();
  }

  async function confirmer(action: Action) {
    setEnCours(true);
    setErreur(null);
    const err = await appeler(`/api/admin/events/${e.id}/${action}`, {});
    setEnCours(false);
    if (err) return setErreur(err);
    setModale(null);
    setALaUne(false);
    onChange(action === "annuler" ? "annule" : "supprime");
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, position: "relative", zIndex: 1 }}>
      {etat === "publie" && (
        <button type="button" className={`${s.btn} ${aLaUne ? s.btnOr : s.btnGris}`} aria-pressed={aLaUne} disabled={enCours} onClick={basculerUne}>
          <Icon name={aLaUne ? "check" : "plus"} size={16} /> {aLaUne ? "À la une" : "Mettre à la une"}
        </button>
      )}
      {etat !== "annule" && (
        <button
          type="button"
          className={`${s.btn} ${s.btnGris}`}
          onClick={() => {
            setErreur(null);
            setModale("annuler");
          }}
        >
          Annuler
        </button>
      )}
      {e.vendus === 0 ? (
        <button
          type="button"
          className={`${s.btn} ${s.btnDanger}`}
          onClick={() => {
            setErreur(null);
            setModale("supprimer");
          }}
        >
          Supprimer
        </button>
      ) : (
        <span className={s.note} style={{ alignSelf: "center" }}>
          Suppression impossible : billets vendus
        </span>
      )}
      {/* Absent de la preview (qui ne simule pas d'échec) : message d'erreur de la route. */}
      {erreur && !modale && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0, width: "100%" }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}

      {modale && (
        <div className={s.fond} onClick={() => !enCours && setModale(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-gestion-${e.id}`} onClick={(ev) => ev.stopPropagation()}>
            <h2 id={`titre-gestion-${e.id}`} className={s.feuilleTitre}>
              {modale === "annuler" ? `Annuler « ${e.titre} » ?` : `Supprimer « ${e.titre} » ?`}
            </h2>
            {modale === "annuler" ? (
              <ul className={s.checklist} style={{ color: "#fff" }}>
                <li>
                  <Icon name="x" size={16} /> Retiré du catalogue et des ventes.
                </li>
                {e.vendus > 0 && (
                  <>
                    <li>
                      <Icon name="ticket" size={16} /> {nombre(e.vendus)} billets invalidés, refusés au scan.
                    </li>
                    <li>
                      <Icon name="wallet" size={16} /> Virements en attente gelés. {montant(e.brut)} de ventes à rembourser aux acheteurs.
                    </li>
                    <li>
                      <Icon name="alert" size={16} /> Les acheteurs ne sont pas prévenus automatiquement (bug #7).
                    </li>
                  </>
                )}
                <li>
                  <Icon name="shield" size={16} /> Aucune donnée supprimée.
                </li>
              </ul>
            ) : (
              <p className={s.feuilleTexte}>Suppression définitive de l&apos;événement et de sa billetterie. Aucun billet n&apos;a été vendu.</p>
            )}
            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setModale(null)}>
                Retour
              </button>
              <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`} disabled={enCours} onClick={() => confirmer(modale)}>
                {enCours ? "Enregistrement…" : modale === "annuler" ? "Annuler l'événement" : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}
      {etat === "annule" && e.statut !== "annule" && <span className={`${s.statut} ${s.stBarre}`}>Annulé</span>}
    </div>
  );
}
