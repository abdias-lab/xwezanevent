import type { Metadata } from "next";
import s from "../../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../../Coquille";
import Icon from "../../../../Icon";
import FormulaireArtiste from "../FormulaireArtiste";

export const metadata: Metadata = { title: "Ajouter un artiste — XwézanEvent" };

/**
 * Demande d'un nouvel artiste (preview V2). En prod :
 * app/(orga)/orga/artistes/nouveau. États : ?etat=verifie (compte vérifié :
 * publication immédiate, pas de WhatsApp), page-perso (le compte a déjà sa
 * propre page artiste : « Moi-même » indisponible).
 */
export default function V2NouvelArtiste({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  return (
    <Coquille actif="artistes">
      <a href={`${B}/orga/artistes`} className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <Icon name="back" size={16} /> Mes artistes
      </a>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Ajouter un artiste</h1>
          <p className={s.sousTitre}>Sa page publique : nom, photo, bio, réseaux, et toutes ses dates au même endroit.</p>
        </div>
      </div>
      <FormulaireArtiste verifie={etat === "verifie"} peutMoiMeme={etat !== "page-perso"} />
      <RubanEtats chemin={`${B}/orga/artistes/nouveau`} etats={["normal", "verifie", "page-perso"]} />
    </Coquille>
  );
}
