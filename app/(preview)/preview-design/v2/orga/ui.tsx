import s from "../espace.module.css";
import { STATUTS, STATUTS_BILLET, STATUTS_VIREMENT, nombre, type Statut, type StatutBillet, type StatutVirement } from "./_orga";

// Statuts : forme + libellé, jamais la couleur seule (plein / contour / barré).
const CLS_EVT: Record<Statut, string> = {
  publie: s.stFort,
  en_validation: s.stAttente,
  brouillon: s.stNeutre,
  termine: s.stNeutre,
  refuse: s.stDanger,
  annule: s.stBarre,
};
export function StatutEvt({ statut }: { statut: Statut }) {
  return <span className={`${s.statut} ${CLS_EVT[statut]}`}>{STATUTS[statut]}</span>;
}

const CLS_BILLET: Record<StatutBillet, string> = { valide: s.stFort, utilise: s.stNeutre, annule: s.stBarre };
export function StatutBillet({ statut }: { statut: StatutBillet }) {
  return <span className={`${s.statut} ${CLS_BILLET[statut]}`}>{STATUTS_BILLET[statut]}</span>;
}

const CLS_VIR: Record<StatutVirement, string> = { demande: s.stAttente, traite: s.stFort, gele: s.stDanger };
export function StatutVirement({ statut }: { statut: StatutVirement }) {
  return <span className={`${s.statut} ${CLS_VIR[statut]}`}>{STATUTS_VIREMENT[statut]}</span>;
}

/** Jauge vendus / capacité : remplissage doré, piste du même doré éclairci. */
export function Jauge({ vendus, total, libelle = "vendus", neutre = false }: { vendus: number; total: number; libelle?: string; neutre?: boolean }) {
  const pct = total > 0 ? Math.round((vendus / total) * 100) : 0;
  return (
    <div className={`${s.jauge} ${neutre ? s.jaugeNeutre : ""}`}>
      <div className={s.jaugeTexte}>
        <span>
          <b>{nombre(vendus)}</b> / {nombre(total)} {libelle}
        </span>
        <span>{pct} %</span>
      </div>
      <div className={s.piste} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={vendus} aria-label={`${nombre(vendus)} sur ${nombre(total)} ${libelle}`}>
        <div className={s.rempli} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function SqueletteListe({ n = 3, kpis = true }: { n?: number; kpis?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Chargement" style={{ display: "grid", gap: 8 }}>
      {kpis && (
        <div className={s.kpis}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`${s.skel} ${s.skelKpi}`} />
          ))}
        </div>
      )}
      <div className={`${s.skel} ${s.skelLigne}`} style={{ width: 140, margin: "24px 0 4px" }} />
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={`${s.skel} ${s.skelCarte}`} />
      ))}
    </div>
  );
}
