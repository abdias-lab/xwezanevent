import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { Header, Footer } from "../chrome";
import { B, RubanEtats } from "../Coquille";

export const metadata: Metadata = { title: "Désabonnement — XwézanEvent" };

/**
 * Désabonnement depuis l'e-mail « nouvelle date » (preview V2,
 * design/ARTISTES.md, lot 3). En prod : app/(public)/desabonnement/[jeton],
 * sans connexion, un clic sur « Me désabonner » (POST). Page de résultat :
 * contenu centré. ?etat=fait : après le désabonnement.
 */
export default function V2Desabonnement({ searchParams }: { searchParams: { etat?: string } }) {
  const fait = searchParams.etat === "fait";
  const artiste = "Zeynab Habib";
  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ padding: "64px 16px 96px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }} role="status">
          <Icon name={fait ? "check" : "mail"} size={48} className={s.montantOr} />
          {fait ? (
            <>
              <h1 className={v.h1}>Désabonnement fait</h1>
              <p className={v.sous} style={{ margin: 0 }}>
                Tu ne recevras plus d&apos;e-mail pour les nouvelles dates de cet artiste.
              </p>
              <a href={`${B}/evenements`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                <Icon name="calendar" /> Voir les événements
              </a>
            </>
          ) : (
            <>
              <h1 className={v.h1}>Ne plus suivre {artiste} ?</h1>
              <p className={v.sous} style={{ margin: 0 }}>
                Tu ne recevras plus d&apos;e-mail à chaque nouvelle date de {artiste}. Tu pourras te réabonner à tout moment depuis sa page.
              </p>
              <div style={{ display: "grid", gap: 8, width: "100%", maxWidth: 320 }}>
                <a href={`${B}/desabonnement?etat=fait`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                  Me désabonner
                </a>
                <a href={`${B}/artiste`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                  Rester abonné
                </a>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <RubanEtats chemin={`${B}/desabonnement`} etats={["normal", "fait"]} />
    </div>
  );
}
