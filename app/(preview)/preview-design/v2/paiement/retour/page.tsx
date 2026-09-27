import type { Metadata } from "next";
import v from "../../v2.module.css";
import s from "../../espace.module.css";
import { Header } from "../../chrome";
import { B, RubanEtats } from "../../Coquille";
import Verification from "./Verification";

export const metadata: Metadata = { title: "Vérification du paiement — XwézanEvent", robots: { index: false } };

/**
 * Retour de FedaPay (preview V2). ?etat=attente : FedaPay ne confirme pas
 * (transaction « pending ») ; par défaut, la vérification aboutit.
 */
export default function V2PaiementRetour({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 48 }}>
        <Verification etatInitial={searchParams.etat === "attente" ? "attente" : "verification"} total="25 000 FCFA" />
        <RubanEtats chemin={`${B}/paiement/retour`} etats={["normal", "attente"]} />
      </main>
    </div>
  );
}
