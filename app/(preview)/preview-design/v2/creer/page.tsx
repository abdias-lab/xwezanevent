import s from "../espace.module.css";
import Coquille, { B, RubanEtats } from "../Coquille";
import Icon from "../../Icon";
import Formulaire from "./Formulaire";

/**
 * Créer un événement (preview V2). En prod : app/(orga)/creer + FormulaireCreation.
 * L'événement part en validation (statut 'en_validation'), il n'est pas publié
 * directement : le texte de la prod (« publié immédiatement ») est un bug, voir
 * design/BUGS_REFONTE.md #1.
 */
export default function V2Creer({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <Coquille actif="creer">
      <a href={`${B}/orga`} className={s.retour}>
        <Icon name="back" /> Tableau de bord
      </a>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Créer un événement</h1>
          <p className={s.sousTitre}>Quatre blocs à remplir, l&apos;aperçu se met à jour au fil de la saisie.</p>
        </div>
      </div>
      <Formulaire erreurServeur={searchParams.etat === "erreur"} envoyeDemo={searchParams.etat === "envoye"} />
      <RubanEtats chemin={`${B}/creer`} etats={["normal", "erreur", "envoye"]} />
    </Coquille>
  );
}
