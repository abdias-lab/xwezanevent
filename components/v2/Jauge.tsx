import s from "./espace.module.css";
import { nombre, pourcent } from "./format";

/** Jauge vendus / capacité (preview : v2/orga/ui.tsx) : remplissage doré, piste du même doré éclairci. */
export default function Jauge({ vendus, total, libelle = "vendus", neutre = false }: { vendus: number; total: number; libelle?: string; neutre?: boolean }) {
  const pct = total > 0 ? Math.round((vendus / total) * 100) : 0;
  return (
    <div className={`${s.jauge} ${neutre ? s.jaugeNeutre : ""}`}>
      <div className={s.jaugeTexte}>
        <span>
          <b>{nombre(vendus)}</b> / {nombre(total)} {libelle}
        </span>
        <span>{pourcent(vendus, total)}</span>
      </div>
      <div className={s.piste} role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={vendus} aria-label={`${nombre(vendus)} sur ${nombre(total)} ${libelle}`}>
        <div className={s.rempli} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
