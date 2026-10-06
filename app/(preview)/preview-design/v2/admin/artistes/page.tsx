import type { Metadata } from "next";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { A, NAV_ADMIN } from "../_admin";
import ValidationArtistes, { type DemandeArtiste } from "./ValidationArtistes";
import PropositionsArtistes, { type PropositionAdmin } from "./PropositionsArtistes";

export const metadata: Metadata = { title: "Artistes — Administration — XwézanEvent" };

const DEMANDES: DemandeArtiste[] = [
  {
    id: "d1",
    genre: "creation",
    nom: "Zeynab",
    nomDemande: null,
    type: "label",
    label: "Lagune Sessions",
    bio: "Chanteuse afro-pop, premier EP en 2025.",
    photo: null,
    liens: [
      { libelle: "Instagram", url: "https://instagram.com/zeynab.lagune" },
      { libelle: "Audiomack", url: "https://audiomack.com/zeynab-lagune" },
    ],
    soumis: "il y a 2 jours",
    demandeur: { nomAffiche: "Lagune Sessions", nomPerso: "Mariam Adjovi", email: "mariam.adjovi@exemple.bj", tel: "01 95 30 77 12", whatsapp: "+229 01 95 30 77 12", verifie: false },
    homonymes: ["Zeynab Habib"],
  },
  {
    id: "d2",
    genre: "creation",
    nom: "Kofi Blaze",
    nomDemande: null,
    type: "auto_produit",
    label: null,
    bio: "",
    photo: null,
    liens: [{ libelle: "TikTok", url: "https://tiktok.com/@kofiblaze" }],
    soumis: "aujourd'hui",
    demandeur: { nomAffiche: "Kofi Blaze", nomPerso: "Kofi Agbodjan", email: "kofi.agbodjan@exemple.bj", tel: null, whatsapp: "+229 01 96 44 21 08", verifie: false },
    homonymes: [],
  },
  {
    id: "d3",
    genre: "renommage",
    nom: "DJ Shado",
    nomDemande: "Shado",
    type: "label",
    label: "Ouidah Live",
    bio: "",
    photo: null,
    liens: [{ libelle: "Instagram", url: "https://instagram.com/djshado" }],
    soumis: "il y a 3 heures",
    demandeur: { nomAffiche: "Ouidah Live", nomPerso: "Rodrigue Houngbédji", email: "contact@ouidahlive.bj", tel: "01 97 42 18 63", whatsapp: null, verifie: true },
    homonymes: [],
  },
];

/** Rattachements proposés en attente (factices, lot 2) : un ancien sans réponse, un récent, un déjà traité ailleurs. */
const PROPOSITIONS: PropositionAdmin[] = [
  {
    cle: "p1",
    eventId: "e1",
    artisteId: "a1",
    artiste: "Zeynab Habib",
    photo: null,
    titre: "Nuit du Wassa",
    lienEvenement: "/preview-design/v2/evenement",
    quand: "14 nov. 2026",
    ou: "Esplanade de l'Amazone, Cotonou",
    depuis: "il y a 12 jours",
    jours: 12,
    organisateur: { nom: "Cotonou Live", role: "organisateur", email: "contact@cotonoulive.bj", tel: "01 96 12 40 55" },
    decideurs: [{ nom: "Ouidah Live", role: "label", email: "contact@ouidahlive.bj", tel: "01 97 42 18 63" }],
  },
  {
    cle: "p2",
    eventId: "e2",
    artisteId: "a2",
    artiste: "Kofi Blaze",
    photo: null,
    titre: "Rooftop Amapiano Vol. 4",
    lienEvenement: null,
    quand: "29 nov. 2026",
    ou: "Ganhi Rooftop, Cotonou",
    depuis: "il y a 2 jours",
    jours: 2,
    organisateur: { nom: "Ganhi Events", role: "organisateur", email: "ganhi.events@exemple.bj", tel: null },
    decideurs: [{ nom: "Kofi Blaze", role: "compte de l'artiste", email: "kofi.agbodjan@exemple.bj", tel: null }],
  },
  {
    cle: "p3",
    eventId: "e3",
    artisteId: "a3",
    artiste: "Kpanlogo Crew",
    photo: null,
    titre: "Festival des Lagunes",
    lienEvenement: "/preview-design/v2/evenement",
    quand: "5–7 déc. 2026",
    ou: "Plage de Fidjrossè, Cotonou",
    depuis: "il y a 8 jours",
    jours: 8,
    organisateur: { nom: "Lagune Sessions", role: "organisateur", email: "mariam.adjovi@exemple.bj", tel: "01 95 30 77 12" },
    decideurs: [{ nom: "Ouidah Live", role: "label", email: "contact@ouidahlive.bj", tel: "01 97 42 18 63" }],
  },
];

/**
 * Artistes (preview V2, design/ARTISTES.md). En prod : app/(admin)/admin/artistes.
 * ?etat=vide : file vide ; ?etat=propositions : file des rattachements proposés.
 */
export default function V2AdminArtistes({ searchParams }: { searchParams: { etat?: string } }) {
  const demandes = searchParams.etat === "vide" ? [] : DEMANDES;
  const vuePropositions = searchParams.etat === "propositions";
  return (
    <Coquille nav={NAV_ADMIN} actif="artistes">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Artistes</h1>
          <p className={s.sousTitre}>Pages artistes à vérifier : contacte le demandeur pour ses pièces, puis valide ou refuse.</p>
        </div>
      </div>
      <div className={s.puces} role="group" aria-label="Filtrer" style={{ marginBottom: 16 }}>
        <a href={`${A}/artistes`} className={`${s.puce} ${vuePropositions ? "" : s.puceOn}`} aria-current={vuePropositions ? undefined : "true"}>
          À valider <span style={{ opacity: 0.6 }}>{demandes.length}</span>
        </a>
        <a href={`${A}/artistes?etat=propositions`} className={`${s.puce} ${vuePropositions ? s.puceOn : ""}`} aria-current={vuePropositions ? "true" : undefined}>
          Propositions <span style={{ opacity: 0.6 }}>{PROPOSITIONS.length}</span>
        </a>
        <a href={`${A}/artistes`} className={s.puce}>
          En ligne <span style={{ opacity: 0.6 }}>4</span>
        </a>
        <a href={`${A}/artistes`} className={s.puce}>
          Refusés <span style={{ opacity: 0.6 }}>1</span>
        </a>
      </div>
      {vuePropositions ? (
        <PropositionsArtistes propositions={PROPOSITIONS} />
      ) : demandes.length === 0 ? (
        <div className={s.vide}>
          <Icon name="check" size={32} />
          <p className={s.videTitre}>Aucune demande en attente</p>
          <p className={s.videTexte}>Les nouvelles pages artistes et les changements de nom à vérifier apparaîtront ici.</p>
        </div>
      ) : (
        <ValidationArtistes demandes={demandes} />
      )}
      <RubanEtats chemin={`${A}/artistes`} etats={["normal", "vide", "propositions"]} />
    </Coquille>
  );
}
