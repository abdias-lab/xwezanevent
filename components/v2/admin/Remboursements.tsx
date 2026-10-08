"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const REFERENCE_MAX = 100;

/**
 * Commandes payées d'événements annulés, à rembourser (V2, design/BUGS_REFONTE.md
 * n°7), reprises de la preview (v2/admin/billets/Remboursements.tsx) : bouton
 * « Marquer remboursé », feuille de confirmation, pastille « Remboursé à … ».
 * Ajout à la preview (écart signalé) : référence de l'opération Mobile Money
 * dans la feuille, et la trace (qui, référence) sous la pastille.
 * /api/admin/orders/[id]/rembourser-annulation garde qui et quand sur la
 * commande : justificatif si un acheteur conteste. Une carte traitée reste
 * affichée avec sa trace jusqu'au prochain chargement ; composant toujours
 * monté, même vide, pour que la dernière confirmation ne disparaisse pas.
 */
export default function Remboursements({ commandes }: { commandes: CommandeARembourser[] }) {
  const router = useRouter();
  const [faits, setFaits] = useState<Record<string, { vue: CommandeARembourser; index: number; heure: string; par: string; reference: string }>>({});
  const [confirmer, setConfirmer] = useState<CommandeARembourser | null>(null);
  const [reference, setReference] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const affichees = useMemo(() => {
    const liste = [...commandes];
    for (const f of Object.values(faits).sort((a, b) => a.index - b.index)) {
      if (!liste.some((c) => c.commande === f.vue.commande)) liste.splice(Math.min(f.index, liste.length), 0, f.vue);
    }
    return liste;
  }, [commandes, faits]);
  const restant = affichees.filter((c) => !faits[c.commande]).reduce((n, c) => n + c.total, 0);

  const ouvrir = (c: CommandeARembourser) => {
    setConfirmer(c);
    setReference("");
    setErreur(null);
  };

  async function valider(c: CommandeARembourser) {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch(`/api/admin/orders/${c.commande}/rembourser-annulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Erreur");
      const heure = new Date(d.le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Porto-Novo" });
      setFaits((p) => ({ ...p, [c.commande]: { vue: c, index: affichees.findIndex((x) => x.commande === c.commande), heure, par: d.par, reference: reference.trim() } }));
      setConfirmer(null);
      router.refresh();
    } catch (e) {
      setErreur((e as Error).message === "Failed to fetch" ? "Erreur réseau, réessaie." : (e as Error).message);
    }
    setEnCours(false);
  }

  if (affichees.length === 0) {
    return (
      <div className={s.vide}>
        <Icon name="check" size={32} />
        <p className={s.videTitre}>Aucun remboursement en attente</p>
        <p className={s.videTexte}>Les commandes payées d&apos;un événement annulé apparaissent ici jusqu&apos;à leur remboursement.</p>
      </div>
    );
  }

  return (
    <>
      <p className={s.alerte}>
        <Icon name="info" />
        <span>
          Envoie à chaque acheteur, sur son numéro Mobile Money, <b>exactement le montant affiché</b> : le prix de ses billets, ni plus ni moins. Les
          frais de l&apos;opérateur de paiement ne sont ni remboursés ni à ajouter. Puis marque la commande remboursée. Reste à rembourser :{" "}
          <b>{montant(restant)}</b>.
        </span>
      </p>
      <ul className={s.pile} style={{ gap: 8 }}>
        {affichees.map((c) => {
          const fait = faits[c.commande];
          return (
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
              {fait ? (
                <div style={{ display: "grid", gap: 4, justifyItems: "start" }} role="status">
                  <span className={`${s.statut} ${s.stFort}`}>Remboursé à {fait.heure}</span>
                  <span className={s.note}>
                    par {fait.par}
                    {fait.reference ? ` · réf. ${fait.reference}` : ""}
                  </span>
                </div>
              ) : (
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => ouvrir(c)}>
                  <Icon name="check" /> Marquer remboursé
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {confirmer && (
        <div className={s.fond} onClick={() => !enCours && setConfirmer(null)}>
          <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby="titre-remb" onClick={(e) => e.stopPropagation()}>
            <h2 id="titre-remb" className={s.feuilleTitre}>
              As-tu bien remboursé {confirmer.nom} ?
            </h2>
            <div className={s.recap}>
              <div>
                <span>Montant</span>
                <b className={s.montantOr}>{montant(confirmer.total)}</b>
              </div>
              <div>
                <span>Numéro</span>
                <b className={s.chiffre}>{confirmer.tel}</b>
              </div>
            </div>
            {/* Ajout à la preview : référence de l'opération, gardée sur la commande avec qui et quand. */}
            <div className={s.champ}>
              <label htmlFor="ref-remb">
                Référence de l&apos;opération Mobile Money <small>(recommandée)</small>
              </label>
              <input id="ref-remb" type="text" maxLength={REFERENCE_MAX} placeholder="Identifiant de la transaction" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <p className={s.feuilleTexte}>
              La commande passera en « remboursée »{confirmer.invite ? "" : " : l'acheteur le verra dans son compte"}. Ton nom, l&apos;heure et la référence
              restent sur la commande. C&apos;est définitif.
            </p>
            {erreur && (
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                <Icon name="alert" />
                <span>{erreur}</span>
              </p>
            )}
            <div className={s.feuilleActions}>
              <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={() => setConfirmer(null)}>
                Pas encore
              </button>
              <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} disabled={enCours} onClick={() => valider(confirmer)}>
                {enCours ? "Enregistrement…" : "Oui, c'est remboursé"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
