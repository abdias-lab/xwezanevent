import type { Metadata } from "next";
import s from "../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { ARTISTES_ORGA, initialesArtiste, type StatutArtiste } from "./_artistes";

export const metadata: Metadata = { title: "Mes artistes — XwézanEvent" };

const STATUT: Record<StatutArtiste, { libelle: string; classe: string }> = {
  valide: { libelle: "En ligne", classe: s.stFort },
  en_validation: { libelle: "En vérification", classe: s.stAttente },
  refuse: { libelle: "Refusé", classe: s.stDanger },
};

/**
 * Mes artistes (preview V2, design/ARTISTES.md) : artistes que le compte
 * gère (créés par lui, de son label ou son propre compte), avec leur statut.
 * En prod : app/(orga)/orga/artistes. États : ?etat=vide, verifie (compte
 * vérifié), envoye (retour après une demande).
 */
export default function V2OrgaArtistes({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const artistes = etat === "vide" ? [] : ARTISTES_ORGA;

  return (
    <Coquille actif="artistes">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Mes artistes</h1>
          <p className={s.sousTitre}>Les pages publiques de tes artistes : leurs dates, leur communauté.</p>
        </div>
        {artistes.length > 0 && (
          <a href={`${B}/orga/artistes/nouveau`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="plus" /> Ajouter un artiste
          </a>
        )}
      </div>

      {etat === "envoye" && (
        <p className={s.alerte} role="status">
          <Icon name="check" />
          <span>Demande envoyée. L&apos;équipe XwézanEvent te contacte par WhatsApp ou par e-mail pour finaliser la vérification.</span>
        </p>
      )}

      {artistes.length === 0 ? (
        <div className={s.vide}>
          <Icon name="users" size={32} />
          <p className={s.videTitre}>Aucun artiste pour l&apos;instant</p>
          <p className={s.videTexte}>
            Crée la page de ton artiste, ou la tienne si tu es auto-produit : nom, photo, bio, réseaux, et toutes ses dates au même endroit.
          </p>
          <a href={`${B}/orga/artistes/nouveau`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
            <Icon name="plus" /> Ajouter un artiste
          </a>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8 }}>
          {artistes.map((a) => (
            <li key={a.id} className={`${s.carte} ${s.carteRangee}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  <span>{initialesArtiste(a.nom)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className={s.carteTitre}>
                    {a.nom}
                    <span className={`${s.statut} ${STATUT[a.statut].classe}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      {STATUT[a.statut].libelle}
                    </span>
                  </p>
                  <p className={s.carteMeta}>{a.type === "auto_produit" ? "Ta page artiste" : "Artiste de ton label"}</p>
                  {a.statut === "en_validation" && <p className={s.carteMeta}>L&apos;équipe te contacte par WhatsApp ou par e-mail pour la vérification.</p>}
                  {a.nomDemande && (
                    <p className={s.carteMeta} style={{ color: "var(--or)" }}>
                      Nouveau nom « {a.nomDemande} » en vérification.
                    </p>
                  )}
                  {a.statut === "refuse" && a.motifRefus && <p className={s.carteMeta}>Motif : {a.motifRefus}</p>}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {a.statut === "valide" && (
                  <a href={`${B}/artiste`} className={`${s.btn} ${s.btnGris}`}>
                    <Icon name="eye" size={16} /> Voir la page
                  </a>
                )}
                <a href={`${B}/orga/artistes/${a.id}`} className={`${s.btn} ${a.statut === "refuse" ? s.btnOr : s.btnGris}`}>
                  <Icon name="edit" size={16} /> {a.statut === "refuse" ? "Corriger" : "Modifier"}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RubanEtats chemin={`${B}/orga/artistes`} etats={["normal", "vide", "envoye"]} />
    </Coquille>
  );
}
