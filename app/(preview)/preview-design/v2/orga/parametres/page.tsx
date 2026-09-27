import s from "../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import NomPublic from "./NomPublic";
import { ORGA } from "../_orga";

// Nom saisi à l'inscription (profiles.nom), jamais affiché publiquement.
const NOM_PERSO = "Rodrigue Houngbédji";

/**
 * Paramètres. Même périmètre qu'en prod (nom public uniquement), plus :
 * le compte en lecture seule et la déconnexion, que la barre basse mobile
 * n'expose pas. États : ?etat=vide (aucun nom public), chargement, erreur.
 */
export default function V2Parametres({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const nomPublic = etat === "vide" ? "" : ORGA.nomPublic;

  return (
    <Coquille actif="parametres">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Paramètres</h1>
          <p className={s.sousTitre}>Ce que les acheteurs voient de toi, et ton compte.</p>
        </div>
      </div>

      {etat === "chargement" ? (
        <div aria-busy="true" aria-label="Chargement" style={{ display: "grid", gap: 8, maxWidth: 560 }}>
          <div className={`${s.skel} ${s.skelCarte}`} style={{ height: 280 }} />
          <div className={`${s.skel} ${s.skelCarte}`} />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          {etat === "vide" && (
            <p className={s.alerte} style={{ marginBottom: 0 }}>
              <Icon name="info" />
              <span>Tes événements affichent pour l&apos;instant ton nom personnel. Choisis un nom public pour ta structure.</span>
            </p>
          )}

          <section className={s.bloc} aria-labelledby="titre-nom-public">
            <div className={s.blocTete}>
              <Icon name="eye" size={20} />
              <h2 id="titre-nom-public" className={s.blocTitre}>
                Nom public
              </h2>
            </div>
            <NomPublic nomPerso={NOM_PERSO} initial={nomPublic} erreur={etat === "erreur"} />
          </section>

          <section className={s.bloc} aria-labelledby="titre-compte">
            <div className={s.blocTete}>
              <Icon name="settings" size={20} />
              <h2 id="titre-compte" className={s.blocTitre}>
                Compte
              </h2>
            </div>
            <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
              <dt>Nom personnel</dt>
              <dd>{NOM_PERSO}</dd>
              <dt>E-mail</dt>
              <dd>{ORGA.email}</dd>
            </dl>
            <p className={s.aide}>
              Ton nom personnel n&apos;est jamais affiché publiquement. Pour le changer, ou changer d&apos;e-mail, écris à{" "}
              <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
                contact@xwezan.com
              </a>
              .
            </p>
            <a href="#" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
              <Icon name="logout" /> Se déconnecter
            </a>
          </section>
        </div>
      )}

      <RubanEtats chemin={`${B}/orga/parametres`} etats={["normal", "vide", "chargement", "erreur"]} />
    </Coquille>
  );
}
