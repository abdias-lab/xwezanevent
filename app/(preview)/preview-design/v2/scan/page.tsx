import s from "../espace.module.css";
import Coquille, { B, RubanEtats } from "../Coquille";
import Scanner from "./Scanner";

/**
 * Scanner les billets (preview V2). En prod : app/(orga)/scan (ScannerClient +
 * RechercheManuelle), tous les événements de l'organisateur.
 * ?etat=camera : accès caméra refusé.
 */
export default function V2Scan({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <Coquille actif="scan">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Scanner les billets</h1>
          <p className={s.sousTitre}>Contrôle des entrées, pour tous tes événements en vente.</p>
        </div>
      </div>
      <Scanner cameraRefusee={searchParams.etat === "camera"} />
      <RubanEtats chemin={`${B}/scan`} etats={["normal", "camera"]} />
    </Coquille>
  );
}
