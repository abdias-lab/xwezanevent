"use client";

import { useEffect, useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../../Icon";
import { B } from "../../Coquille";

type Etat = "verification" | "attente" | "valide";

/**
 * Retour de FedaPay (preview V2). En prod, /paiement/retour est une simple
 * redirection serveur : « approved » → confirmation, sinon → échec, y compris
 * quand la transaction est seulement « pending » (BUGS_REFONTE #12 : la page
 * d'échec propose alors de repayer). Ici : écran d'attente qui revérifie, et
 * qui ne propose JAMAIS de repayer tant que le paiement peut être en cours.
 */
export default function Verification({ etatInitial, total }: { etatInitial: Etat; total: string }) {
  const [etat, setEtat] = useState<Etat>(etatInitial);
  const [essais, setEssais] = useState(0);

  // Simulation : 3 vérifications espacées, puis confirmation (ou attente prolongée).
  useEffect(() => {
    if (etat !== "verification") return;
    const t = setTimeout(() => {
      if (essais >= 2) setEtat(etatInitial === "attente" ? "attente" : "valide");
      else setEssais((n) => n + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [etat, essais, etatInitial]);

  useEffect(() => {
    if (etat === "valide") {
      const t = setTimeout(() => (window.location.href = `${B}/confirmation`), 900);
      return () => clearTimeout(t);
    }
  }, [etat]);

  return (
    <div className={s.vide} style={{ maxWidth: 520, margin: "0 auto" }} aria-live="polite">
      {etat === "verification" && (
        <>
          <span className={s.attenteRond} aria-hidden="true" />
          <p className={s.videTitre}>On vérifie ton paiement…</p>
          <p className={s.videTexte}>
            Si ce n&apos;est pas déjà fait, valide la demande de {total} sur ton téléphone. Ne ferme pas cette page.
          </p>
        </>
      )}

      {etat === "valide" && (
        <>
          <Icon name="check" size={48} className={s.montantOr} />
          <p className={s.videTitre}>Paiement validé</p>
          <p className={s.videTexte}>On prépare tes billets…</p>
        </>
      )}

      {etat === "attente" && (
        <>
          <Icon name="clock" size={48} className={s.montantOr} />
          <p className={s.videTitre}>Paiement en cours de validation</p>
          <p className={s.videTexte}>
            FedaPay ne nous a pas encore confirmé ton paiement de {total}. <b>Si tu l&apos;as validé sur ton téléphone, ne repaie pas</b> : tes billets arrivent par
            e-mail dès que FedaPay confirme.
          </p>
          <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 360 }}>
            <button
              type="button"
              className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}
              onClick={() => {
                setEssais(0);
                setEtat("verification");
              }}
            >
              <Icon name="repeat" /> Vérifier à nouveau
            </button>
            <a href={`${B}/compte`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
              Voir mes commandes
            </a>
          </div>
          <p className={s.note} style={{ maxWidth: 400 }}>
            Tu n&apos;as rien validé, ou tu as refusé la demande ? Elle expire d&apos;elle-même : tu pourras alors recommencer ta commande.
          </p>
        </>
      )}
    </div>
  );
}
