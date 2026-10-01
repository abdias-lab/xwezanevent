import type { Metadata } from "next";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { A, NAV_ADMIN } from "../_admin";
import ValidationArtistes, { type DemandeArtiste } from "./ValidationArtistes";

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

/** Artistes (preview V2, design/ARTISTES.md). En prod : app/(admin)/admin/artistes. ?etat=vide : file vide. */
export default function V2AdminArtistes({ searchParams }: { searchParams: { etat?: string } }) {
  const demandes = searchParams.etat === "vide" ? [] : DEMANDES;
  return (
    <Coquille nav={NAV_ADMIN} actif="artistes">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Artistes</h1>
          <p className={s.sousTitre}>Pages artistes à vérifier : contacte le demandeur pour ses pièces, puis valide ou refuse.</p>
        </div>
      </div>
      <div className={s.puces} role="group" aria-label="Filtrer" style={{ marginBottom: 16 }}>
        <a href={`${A}/artistes`} className={`${s.puce} ${s.puceOn}`} aria-current="true">
          À valider <span style={{ opacity: 0.6 }}>{demandes.length}</span>
        </a>
        <a href={`${A}/artistes`} className={s.puce}>
          En ligne <span style={{ opacity: 0.6 }}>4</span>
        </a>
        <a href={`${A}/artistes`} className={s.puce}>
          Refusés <span style={{ opacity: 0.6 }}>1</span>
        </a>
      </div>
      {demandes.length === 0 ? (
        <div className={s.vide}>
          <Icon name="check" size={32} />
          <p className={s.videTitre}>Aucune demande en attente</p>
          <p className={s.videTexte}>Les nouvelles pages artistes et les changements de nom à vérifier apparaîtront ici.</p>
        </div>
      ) : (
        <ValidationArtistes demandes={demandes} />
      )}
      <RubanEtats chemin={`${A}/artistes`} etats={["normal", "vide"]} />
    </Coquille>
  );
}
