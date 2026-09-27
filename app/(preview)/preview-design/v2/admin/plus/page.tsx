import s from "../../espace.module.css";
import Coquille, { B } from "../../Coquille";
import Icon from "../../../Icon";
import { NAV_ADMIN } from "../_admin";

/** « Plus » (barre basse mobile) : rubriques secondaires de l'admin. Sur desktop, la colonne latérale les montre déjà. */
export default function V2AdminPlus() {
  const secondaires = NAV_ADMIN.entrees.filter((e) => e.secondaire);
  return (
    <Coquille nav={NAV_ADMIN} actif="plus">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Plus</h1>
          <p className={s.sousTitre}>Les autres rubriques de l&apos;administration.</p>
        </div>
      </div>
      <ul className={s.pile} style={{ gap: 8 }}>
        {secondaires.map((e) => (
          <li key={e.cle} className={`${s.carte} ${s.carteLien}`}>
            <div className={s.carteHaut} style={{ alignItems: "center" }}>
              <p className={s.carteTitre} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name={e.icone} size={24} />
                <a href={e.href}>{e.libelle}</a>
              </p>
              <Icon name="chevron-right" />
            </div>
          </li>
        ))}
      </ul>
      <ul className={s.pile} style={{ gap: 8, marginTop: 24 }}>
        <li>
          <a href={B} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ width: "100%" }}>
            <Icon name="eye" /> Voir le site
          </a>
        </li>
        <li>
          <a href="#" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ width: "100%" }}>
            <Icon name="logout" /> Se déconnecter
          </a>
        </li>
      </ul>
    </Coquille>
  );
}
