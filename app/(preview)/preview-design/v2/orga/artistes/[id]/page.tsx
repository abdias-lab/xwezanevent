import type { Metadata } from "next";
import { notFound } from "next/navigation";
import s from "../../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../../Coquille";
import Icon from "../../../../Icon";
import FormulaireArtiste from "../FormulaireArtiste";
import { artisteOrga } from "../_artistes";

export const metadata: Metadata = { title: "Modifier un artiste — XwézanEvent" };

/**
 * Modification d'un artiste (preview V2). En prod :
 * app/(orga)/orga/artistes/[id]. Bio, photo et réseaux libres ; nom de scène
 * en vérification pour un compte non vérifié. Artistes de démonstration :
 * a1 (en ligne), a2 (en vérification), a3 (nouveau nom en vérification),
 * a4 (refusé). ?etat=verifie : compte vérifié.
 */
export default function V2ModifierArtiste({ params, searchParams }: { params: { id: string }; searchParams: { etat?: string } }) {
  const artiste = artisteOrga(params.id);
  if (!artiste) notFound();
  return (
    <Coquille actif="artistes">
      <a href={`${B}/orga/artistes`} className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <Icon name="back" size={16} /> Mes artistes
      </a>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>{artiste.nom}</h1>
          <p className={s.sousTitre}>{artiste.statut === "valide" ? "Les modifications sont visibles tout de suite sur sa page." : "Sa page n'est pas encore en ligne."}</p>
        </div>
      </div>
      {artiste.statut === "refuse" && artiste.motifRefus && (
        <p className={`${s.alerte} ${s.alerteDanger}`}>
          <Icon name="alert" />
          <span>
            Demande refusée : {artiste.motifRefus} Corrige et renvoie-la, elle repassera en vérification.
          </span>
        </p>
      )}
      <FormulaireArtiste artiste={artiste} verifie={searchParams.etat === "verifie"} peutMoiMeme />
      <RubanEtats chemin={`${B}/orga/artistes/${artiste.id}`} etats={["normal", "verifie"]} />
    </Coquille>
  );
}
