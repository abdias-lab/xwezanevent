import { notFound } from "next/navigation";
import s from "../../../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../../../Coquille";
import Icon from "../../../../../Icon";
import { EVENEMENTS } from "../../../../../_data";
import { MODIFIABLE, STATUTS, chiffres, evenementOrga } from "../../../_orga";
import { StatutEvt } from "../../../ui";
import FormulaireModif from "./FormulaireModif";

/**
 * Modifier un événement (preview V2). En prod : app/(orga)/orga/evenements/[id]/modifier.
 * ?etat=erreur : refus serveur « date avancée après ventes ».
 */
export default function V2Modifier({ params, searchParams }: { params: { id: string }; searchParams: { etat?: string } }) {
  const e = evenementOrga(params.id);
  if (!e) notFound();
  const fiche = `${B}/orga/evenements/${e.id}`;
  const image = EVENEMENTS.find((x) => x.slug === e.id)?.image ?? null;

  return (
    <Coquille actif="accueil">
      <a href={fiche} className={s.retour}>
        <Icon name="back" /> {e.titre}
      </a>
      <div className={s.entete}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <StatutEvt statut={e.statut} />
          </div>
          <h1 className={s.titre}>Modifier l&apos;événement</h1>
          <p className={s.sousTitre}>Description, catégories, date et images. Les changements sont visibles dès l&apos;enregistrement.</p>
        </div>
      </div>

      {MODIFIABLE.has(e.statut) ? (
        <FormulaireModif e={e} vendus={chiffres(e).vendus} imageInitiale={image} erreurServeur={searchParams.etat === "erreur"} />
      ) : (
        <div className={s.vide}>
          <Icon name="shield" size={32} />
          <p className={s.videTitre}>Cet événement n&apos;est plus modifiable</p>
          <p className={s.videTexte}>
            Il est « {STATUTS[e.statut].toLowerCase()} ». Seuls les événements en brouillon, en validation ou en vente peuvent être modifiés.
          </p>
          <a href={fiche} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="back" /> Retour à la fiche
          </a>
        </div>
      )}

      <RubanEtats chemin={`${fiche}/modifier`} etats={["normal", "erreur"]} />
    </Coquille>
  );
}
