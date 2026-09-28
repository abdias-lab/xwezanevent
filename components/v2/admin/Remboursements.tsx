import s from "../espace.module.css";
import Icon from "../Icon";
import { montant } from "../format";

export type CommandeARembourser = {
  commande: string;
  nom: string;
  tel: string;
  email: string;
  invite: boolean;
  evenement: string;
  billets: number;
  total: number;
};

/**
 * Commandes payées d'événements annulés, à rembourser (V2), reprises de la
 * preview (app/(preview)/preview-design/v2/admin/billets/Remboursements.tsx).
 * EN LECTURE SEULE (décision du 2026-09-28) : le bouton « Marquer
 * remboursé » et sa route arrivent avec le chantier annulation (bug #7,
 * design/BUGS_REFONTE.md).
 */
export default function Remboursements({ commandes }: { commandes: CommandeARembourser[] }) {
  const restant = commandes.reduce((n, c) => n + c.total, 0);

  return (
    <>
      <p className={s.alerte}>
        <Icon name="info" />
        <span>
          Rembourse chaque acheteur sur son numéro Mobile Money (prix payé en entier, sans frais). Reste à rembourser : <b>{montant(restant)}</b>.
        </span>
      </p>
      <ul className={s.pile} style={{ gap: 8 }}>
        {commandes.map((c) => (
          <li key={c.commande} className={`${s.carte} ${s.carteRangee}`}>
            <div className={s.carteHaut}>
              <div>
                <p className={s.carteTitre}>
                  {montant(c.total)} · {c.nom}
                  {c.invite && (
                    <span className={`${s.statut} ${s.stNeutre}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      Invité
                    </span>
                  )}
                </p>
                <p className={s.carteMeta}>
                  <b className={s.chiffre} style={{ color: "#fff" }}>
                    {c.tel}
                  </b>{" "}
                  · {c.email}
                </p>
                <p className={s.carteMeta}>
                  {c.evenement} · {c.billets} billet{c.billets > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
