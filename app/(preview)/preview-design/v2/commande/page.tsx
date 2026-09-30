import type { Metadata } from "next";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { Header } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import { EVENEMENT_DETAIL, dateLongue } from "../../_data";
import Commande, { type TarifCommande } from "./Commande";

export const metadata: Metadata = { title: "Commande — XwézanEvent", robots: { index: false } };

// Stock de démonstration : « Table 6 personnes » presque épuisée.
const DISPONIBLES: Record<string, number> = { std: 180, vip: 12, table: 3 };

/**
 * Commande (preview V2). Panier dans l'URL (?std=2&vip=1). États :
 * ?etat=connecte (coordonnées préremplies), gratuit (événement gratuit),
 * stock (refus serveur « stock insuffisant », comme /api/orders), deja-paye
 * (même panier payé il y a moins de 5 min : refus avec le temps restant).
 */
export default function V2Commande({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const etat = searchParams.etat;
  const gratuit = etat === "gratuit";
  const tarifs: TarifCommande[] = gratuit
    ? [{ id: "libre", nom: "Entrée libre", detail: "Sur réservation, dans la limite des places", prix: 0, disponibles: 120 }]
    : EVENEMENT_DETAIL.tarifs.map((t) => ({ ...t, disponibles: DISPONIBLES[t.id] ?? 0 }));

  const initial: Record<string, number> = {};
  for (const t of tarifs) {
    const n = Number(searchParams[t.id]);
    if (Number.isInteger(n) && n > 0) initial[t.id] = Math.min(n, 10);
  }
  if (Object.keys(initial).length === 0) initial[tarifs[0].id] = 2;
  if (etat === "stock") initial.table = 5;

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <a href={`${B}/evenement`} className={s.retour} style={{ marginTop: 16 }}>
          <Icon name="back" /> {gratuit ? "Retour à l'événement" : EVENEMENT_DETAIL.titre}
        </a>
        <h1 className={v.h1} style={{ margin: "8px 0 24px" }}>
          Ta <em>commande.</em>
        </h1>
        <Commande
          titre={gratuit ? "Rire au Palais : plateau d'humour" : EVENEMENT_DETAIL.titre}
          quand={gratuit ? "sam. 10 oct. 2026 · 19:00" : `${dateLongue(EVENEMENT_DETAIL)} · ${EVENEMENT_DETAIL.heure}`}
          lieu={gratuit ? "Centre Songhaï, Porto-Novo" : `${EVENEMENT_DETAIL.lieu}, ${EVENEMENT_DETAIL.ville}`}
          tarifs={tarifs}
          initial={initial}
          compte={etat === "connecte" ? { nom: "Aïcha Houngbédji", email: "aicha.houngbedji@exemple.bj", tel: "01 97 42 18 63" } : null}
          erreurStock={etat === "stock"}
          erreurDejaPaye={etat === "deja-paye"}
        />
        <RubanEtats chemin={`${B}/commande`} etats={["normal", "connecte", "gratuit", "stock", "deja-paye"]} />
      </main>
    </div>
  );
}
