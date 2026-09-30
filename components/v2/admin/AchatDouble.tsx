"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { montant } from "../format";

export type CommandeDouble = { id: string; total: number; creeeLe: string };

const ref = (id: string) => `XWZ-${id.slice(0, 8).toUpperCase()}`;

/**
 * Commandes d'un achat payé en double (BUGS_REFONTE n°25), chacune avec
 * « Marquer remboursée » : confirmation, puis POST
 * /api/admin/orders/[id]/rembourser-double (commande « rembourse », billets
 * annulés, places remises en vente). La plus récente est en général celle
 * en trop ; la route refuse une commande dont un billet a déjà été scanné.
 */
export default function AchatDouble({ commandes, telephone }: { commandes: CommandeDouble[]; telephone: string | null }) {
  const router = useRouter();
  const [aConfirmer, setAConfirmer] = useState<CommandeDouble | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer(c: CommandeDouble) {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/orders/${c.id}/rembourser-double`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreur(data.error ?? "Remboursement impossible");
        setEnCours(false);
        return;
      }
      setAConfirmer(null);
      setEnCours(false);
      router.refresh(); // le cas disparaît de « À traiter »
    } catch {
      setErreur("Erreur réseau");
      setEnCours(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, width: "100%" }}>
      {commandes.map((c, i) => (
        <div key={c.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span className={s.carteMeta} style={{ margin: 0 }}>
            <b className={s.chiffre}>{ref(c.id)}</b> · {montant(c.total)}
            {i === commandes.length - 1 ? " · la plus récente" : ""}
          </span>
          <button
            type="button"
            className={`${s.btn} ${s.btnGris}`}
            onClick={() => {
              setErreur(null);
              setAConfirmer(c);
            }}
          >
            <Icon name="check" size={16} /> Marquer remboursée
          </button>
        </div>
      ))}

      {aConfirmer && (
        <div className={s.fond} onClick={() => !enCours && setAConfirmer(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-remb-${aConfirmer.id}`} onClick={(e) => e.stopPropagation()}>
            <h2 id={`titre-remb-${aConfirmer.id}`} className={s.feuilleTitre}>
              As-tu bien remboursé {montant(aConfirmer.total)} ?
            </h2>
            <ul className={s.checklist} style={{ color: "#fff" }}>
              <li>
                <Icon name="wallet" size={16} /> Remboursement Mobile Money{telephone ? ` au ${telephone}` : ""}, commande {ref(aConfirmer.id)}.
              </li>
              <li>
                <Icon name="ticket" size={16} /> Les billets de cette commande seront annulés, refusés au scan.
              </li>
              <li>
                <Icon name="repeat" size={16} /> Les places reviennent en vente, et ne comptent plus dans le reversement de l&apos;organisateur.
              </li>
            </ul>
            <p className={s.feuilleTexte}>Marque-la seulement après le remboursement réel. C&apos;est définitif.</p>
            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setAConfirmer(null)}>
                Pas encore
              </button>
              <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} autoFocus disabled={enCours} onClick={() => confirmer(aConfirmer)}>
                {enCours ? "Enregistrement…" : "Oui, c'est remboursé"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
