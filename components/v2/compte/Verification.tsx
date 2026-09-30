"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";

type Etat = "verification" | "attente";

// Revérifications automatiques avant d'afficher « en cours de validation ».
const VERIFICATIONS_AUTO = 2;
const INTERVALLE_MS = 3000;

/**
 * Écran d'attente du retour FedaPay (V2), repris de la preview
 * (v2/paiement/retour/Verification.tsx). Affiché par /paiement/retour quand
 * la transaction n'est ni payée ni en échec définitif (« pending », statut
 * inconnu, vérification impossible). Chaque vérification relance le Server
 * Component (router.refresh) : il réinterroge FedaPay et redirige vers la
 * confirmation ou l'échec dès que l'issue est connue. Ne propose JAMAIS de
 * repayer tant que le paiement peut être en cours (BUGS_REFONTE n°12).
 */
export default function Verification({ total, compte }: { total: string; compte: boolean }) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>("verification");
  const [essais, setEssais] = useState(0);

  useEffect(() => {
    if (etat !== "verification") return;
    const t = setTimeout(() => {
      if (essais >= VERIFICATIONS_AUTO) setEtat("attente");
      else {
        setEssais((n) => n + 1);
        router.refresh();
      }
    }, INTERVALLE_MS);
    return () => clearTimeout(t);
  }, [etat, essais, router]);

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
                router.refresh();
              }}
            >
              <Icon name="repeat" /> Vérifier à nouveau
            </button>
            {/* Acheteur invité : pas de compte, ses billets se retrouvent par e-mail. */}
            <Link href={compte ? "/compte" : "/billet"} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
              {compte ? "Voir mes commandes" : "Retrouver mon billet"}
            </Link>
          </div>
          <p className={s.note} style={{ maxWidth: 400 }}>
            Tu n&apos;as rien validé, ou tu as refusé la demande ? Elle expire d&apos;elle-même : tu pourras alors recommencer ta commande.
          </p>
        </>
      )}
    </div>
  );
}
