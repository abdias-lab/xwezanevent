import type { ReactNode } from "react";
import { getPaysActuelDetail, ADJECTIF_PAR_PAYS } from "@/lib/pays";

/**
 * Panneau marketing du côté "marque" des pages `.split` (connexion,
 * mot-de-passe-oublié, réinitialiser-mot-de-passe, retrouver mon billet) —
 * auparavant dupliqué à l'identique dans les 4 fichiers, avec "La
 * billetterie du Bénin" en dur. Factorisé ici, pays-aware : c'est le
 * contexte de NAVIGATION du visiteur (cookie/géolocalisation, voir
 * lib/pays.ts::getPaysActuel), pas celui d'un événement précis — ces pages
 * n'ont justement aucun événement en contexte.
 *
 * `titre`/`description` par défaut reprennent le texte générique actuel
 * (utilisé par connexion/mot-de-passe-oublié/réinitialiser) ; `/billet` les
 * override avec son propre texte, seul l'eyebrow pays reste commun.
 */
export default async function PanneauMarketing({
  titre,
  description,
  stats,
}: {
  titre?: ReactNode;
  description?: ReactNode;
  stats?: { n: string; l: string }[];
}) {
  const pays = await getPaysActuelDetail();
  const adjectif = ADJECTIF_PAR_PAYS[pays.code] ?? ADJECTIF_PAR_PAYS.bj;

  return (
    <div className="marque">
      <div className="applique" aria-hidden="true" />
      <div style={{ position: "relative" }}>
        <span className="eyebrow">La billetterie du {pays.nom}</span>
        <h1>
          {titre ?? (
            <>
              Rejoins la scène <span className="fete">{adjectif}.</span>
            </>
          )}
        </h1>
        <p>
          {description ?? (
            <>Concerts, festivals, soirées — tout le {pays.nom} dans ta poche, un billet à la fois.</>
          )}
        </p>
        {stats && (
          <div className="stats">
            {stats.map((s) => (
              <div className="stat" key={s.l}>
                <div className="n">{s.n}</div>
                <div className="l">{s.l}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
