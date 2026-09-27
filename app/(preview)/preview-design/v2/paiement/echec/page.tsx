import type { Metadata } from "next";
import v from "../../v2.module.css";
import s from "../../espace.module.css";
import Icon, { type IconName } from "../../../Icon";
import { Header } from "../../chrome";
import { B, RubanEtats } from "../../Coquille";
import Relancer from "./Relancer";

export const metadata: Metadata = { title: "Paiement non abouti — XwézanEvent", robots: { index: false } };

// Motifs définitifs uniquement (mêmes que MESSAGES en prod, sauf « en_attente »,
// traité par l'écran d'attente de /paiement/retour : voir BUGS_REFONTE #12).
const MOTIFS: Record<string, { icone: IconName; titre: string; detail: string; conseil?: string }> = {
  annule: {
    icone: "x",
    titre: "Paiement annulé",
    detail: "Tu as annulé le paiement avant sa validation. Aucune somme n'a été débitée.",
  },
  refuse: {
    icone: "alert",
    titre: "Paiement refusé",
    detail: "Ton opérateur Mobile Money a refusé la transaction. Aucune somme n'a été débitée.",
    conseil: "Vérifie ton solde, ou réessaie avec un autre numéro.",
  },
  indisponible: {
    icone: "wifi-off",
    titre: "Paiement momentanément indisponible",
    detail: "Le service de paiement FedaPay ne répond pas pour le moment. Ta commande est gardée, rien n'a été débité.",
    conseil: "Réessaie dans un instant.",
  },
  defaut: {
    icone: "alert",
    titre: "Paiement non abouti",
    detail: "Le paiement n'a pas pu être validé. Aucune somme n'a été débitée.",
  },
};

/** Échec de paiement (preview V2). En prod : app/(public)/paiement/echec. ?raison=annule | refuse | indisponible. */
export default function V2PaiementEchec({ searchParams }: { searchParams: { raison?: string; etat?: string } }) {
  // ?raison= comme en prod ; ?etat= pour le ruban de la preview.
  const m = MOTIFS[searchParams.raison ?? searchParams.etat ?? "defaut"] ?? MOTIFS.defaut;
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 48 }}>
        <div className={s.vide} style={{ maxWidth: 520, margin: "0 auto" }}>
          <Icon name={m.icone} size={48} />
          <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
            {m.titre}
          </h1>
          <p className={s.videTexte}>{m.detail}</p>
          {m.conseil && <p className={s.videTexte}>{m.conseil}</p>}

          <div className={s.panneau} style={{ width: "100%", maxWidth: 360, textAlign: "left" }}>
            <p className={s.panneauTitre}>Ta commande</p>
            <p style={{ fontWeight: 700 }}>Festival Vodoun Jazz</p>
            <p className={s.note}>2 × Pass Standard, 1 × Pass VIP · 25 000 FCFA</p>
          </div>

          <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 360 }}>
            <Relancer total="25 000 FCFA" />
            <a href={`${B}/commande?std=2&vip=1`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
              Modifier ma commande
            </a>
            <a href={`${B}/evenement`} className={s.note} style={{ textDecoration: "underline" }}>
              Retour à l&apos;événement
            </a>
          </div>
        </div>
        <RubanEtats chemin={`${B}/paiement/echec`} etats={["normal", "annule", "refuse", "indisponible"]} />
      </main>
    </div>
  );
}
