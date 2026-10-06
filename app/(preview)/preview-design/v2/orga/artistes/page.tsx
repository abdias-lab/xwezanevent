import type { Metadata } from "next";
import s from "../../espace.module.css";
import Coquille, { B, RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { ARTISTES_ORGA, PROPOSITIONS_DEMO, initialesArtiste, type StatutArtiste } from "./_artistes";

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
 * vérifié), envoye (retour après une demande), proposition (ouverte depuis
 * le lien de l'e-mail), acceptee, refusee (retour après une décision).
 */
export default function V2OrgaArtistes({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const artistes = etat === "vide" ? [] : ARTISTES_ORGA;
  const propositions = etat === "vide" || etat === "acceptee" || etat === "refusee" ? PROPOSITIONS_DEMO.slice(1, etat === "vide" ? 1 : 2) : PROPOSITIONS_DEMO;
  const cible = etat === "proposition" ? "p1" : null;

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

      {(etat === "acceptee" || etat === "refusee") && (
        <p className={s.alerte} role="status">
          <Icon name="check" />
          <span>
            {etat === "acceptee"
              ? "Proposition acceptée : l'artiste s'affiche sur l'événement et l'événement sur sa page."
              : "Proposition refusée : l'artiste n'apparaîtra pas sur cet événement. L'organisateur le voit sur sa fiche."}
          </span>
        </p>
      )}

      {propositions.length > 0 && (
        <section aria-labelledby="propositions-titre" style={{ marginBottom: 24 }}>
          <h2 id="propositions-titre" className={s.intertitre}>
            Propositions <span style={{ opacity: 0.6 }}>{propositions.length}</span>
          </h2>
          <p className={s.aide} style={{ marginBottom: 12 }}>
            Des organisateurs veulent afficher tes artistes sur leur événement. Rien n&apos;apparaît avant ton accord.
          </p>
          <ul className={s.pile} style={{ gap: 8 }}>
            {propositions.map((p) => (
              <li key={p.cle} id={`proposition-${p.cle}`} className={`${s.carte} ${s.carteRangee} ${p.cle === cible ? s.carteEnAvant : ""}`}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                  <div className={s.avatarArtiste} aria-hidden="true">
                    <span>{initialesArtiste(p.artiste)}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p className={s.carteTitre}>{p.titre}</p>
                    <p className={s.carteMeta}>
                      Avec <b>{p.artiste}</b> · {p.quand} · {p.lieu}
                    </p>
                    <p className={s.carteMeta}>
                      Proposé par <b>{p.organisateur}</b>, {p.depuis}
                      {p.enLigne ? "" : " · événement pas encore en ligne"}
                    </p>
                  </div>
                </div>
                <div className={s.propositionActions}>
                  {p.enLigne && (
                    <a href={`${B}/evenement`} className={`${s.btn} ${s.btnGris}`}>
                      <Icon name="eye" size={16} /> Voir
                    </a>
                  )}
                  <a href={`${B}/orga/artistes?etat=refusee`} className={`${s.btn} ${s.btnGris}`}>
                    Refuser
                  </a>
                  <a href={`${B}/orga/artistes?etat=acceptee`} className={`${s.btn} ${s.btnOr}`}>
                    <Icon name="check" size={16} /> Accepter
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {propositions.length > 0 && artistes.length > 0 && <h2 className={s.intertitre}>Tes artistes</h2>}

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

      <RubanEtats chemin={`${B}/orga/artistes`} etats={["normal", "vide", "envoye", "proposition", "acceptee", "refusee"]} />
    </Coquille>
  );
}
