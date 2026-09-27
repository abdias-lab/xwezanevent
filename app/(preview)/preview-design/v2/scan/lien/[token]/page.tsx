import type { Metadata } from "next";
import v from "../../../v2.module.css";
import s from "../../../espace.module.css";
import Icon from "../../../../Icon";
import { RubanEtats, B } from "../../../Coquille";
import { chiffres, dateCourteOrga, evenementOrga } from "../../../orga/_orga";
import Scanner from "../../Scanner";

export const metadata: Metadata = { title: "Scan délégué — XwézanEvent", robots: { index: false } };

// Jeton de démonstration → événement (en prod : resoudreEvenementParToken, jeton révocable).
const JETONS: Record<string, string> = { demo: "nuit-zinli" };

/**
 * Lien de scan délégué (preview V2). En prod : app/scan/lien/[token].
 * Accès sans compte au contrôle d'UN événement ; le jeton est l'autorisation,
 * revérifié à chaque requête. Pas de navigation vers l'espace organisateur.
 * Démonstration : /scan/lien/demo (valide), /scan/lien/invalide (révoqué).
 */
export default function V2ScanDelegue({ params, searchParams }: { params: { token: string }; searchParams: { etat?: string } }) {
  const e = JETONS[params.token] ? evenementOrga(JETONS[params.token]) : undefined;

  if (!e) {
    return (
      <div className={`${v.racine} ${s.racineEspace}`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className={s.vide} style={{ maxWidth: 400 }}>
          <Icon name="link" size={48} className={s.montantOr} />
          <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
            Lien invalide ou révoqué
          </h1>
          <p className={s.videTexte}>Ce lien de scan n&apos;existe plus. Demande à l&apos;organisateur de t&apos;en partager un nouveau.</p>
        </div>
      </div>
    );
  }

  const c = chiffres(e);
  return (
    <div className={`${v.racine} ${s.racineEspace}`} style={{ minHeight: "100vh" }}>
      <header className={s.topbar} style={{ position: "sticky", top: 0 }}>
        <span className={v.logo} aria-label="XwézanEvent">
          <span className={v.logoX}>Xwézan</span>
        </span>
        <span className={s.role}>Accès délégué</span>
      </header>
      <main style={{ padding: "16px 16px 48px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 className={s.titre}>{e.titre}</h1>
          <p className={s.sousTitre}>
            {dateCourteOrga(e.debut, e.fin)} · {e.heure} · {e.lieu}
          </p>
          <p className={s.note} style={{ marginTop: 4 }}>
            Tu contrôles les entrées de cet événement uniquement. Ce lien peut être révoqué par l&apos;organisateur à tout moment.
          </p>
        </div>
        <Scanner cameraRefusee={searchParams.etat === "camera"} evenementId={e.id} compteur={{ scannes: e.scannes, total: c.vendus }} retour={false} />
        <RubanEtats chemin={`${B}/scan/lien/demo`} etats={["normal", "camera"]} />
      </main>
    </div>
  );
}
