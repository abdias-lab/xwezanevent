import type { CSSProperties } from "react";
import s from "../../espace.module.css";
import Coquille, { RubanEtats } from "../../Coquille";
import Icon from "../../../Icon";
import { EVENEMENTS } from "../../../_data";
import { StatutEvt } from "../../orga/ui";
import { STATUTS, dateCourteOrga, montant, nombre, type Statut } from "../../orga/_orga";
import { A, EVENEMENTS_ADMIN, NAV_ADMIN, chiffresAdmin, depuis, joursDepuis, nomAffiche, organisateur, type EvenementAdmin } from "../_admin";
import Gestion from "./Gestion";
import Validation, { type Controle, type EvenementAValider } from "./Validation";

// Formats d'affiche de démonstration (_data.ts) : portrait 2:3, paysage 3:2, carré.
const IMAGES = { portrait: EVENEMENTS[0].image, paysage: EVENEMENTS[6].image, carre: EVENEMENTS[4].image };

const FILTRES: { cle: string; libelle: string; statut: Statut }[] = [
  { cle: "attente", libelle: "À valider", statut: "en_validation" },
  { cle: "publie", libelle: "En vente", statut: "publie" },
  { cle: "termine", libelle: "Terminés", statut: "termine" },
  { cle: "refuse", libelle: "Refusés", statut: "refuse" },
  { cle: "annule", libelle: "Annulés", statut: "annule" },
  // Ajout du 2026-09-28 (intégration) : sans cette puce, les brouillons n'étaient visibles nulle part côté admin.
  { cle: "brouillon", libelle: "Brouillons", statut: "brouillon" },
];

const COLS = { "--cols": "minmax(0, 1.8fr) minmax(0, 1fr) 100px 130px 110px minmax(0, 1.7fr)" } as CSSProperties;

/** Contrôles automatiques proposés à l'admin (et motifs de refus prêts à l'emploi). */
function controles(e: EvenementAdmin): Controle[] {
  const out: Controle[] = [];
  const o = organisateur(e.organisateur);
  if (!e.image) out.push({ texte: "Pas d'affiche : la carte affichera les initiales du titre.", motif: "Ajoute une affiche à ton événement." });
  if (e.description.length < 80)
    out.push({ texte: `Description très courte (${e.description.length} caractères).`, motif: "Complète la description : programme, artistes, infos pratiques." });
  if (/préciser/i.test(e.lieu)) out.push({ texte: "Lieu non précisé.", motif: "Indique le lieu exact de l'événement." });
  for (const t of e.tarifs)
    if (t.prix >= 50000)
      out.push({ texte: `Tarif élevé : ${t.nom} à ${montant(t.prix)}. Vérifier qu'il ne s'agit pas d'une faute de frappe.`, motif: `Vérifie le prix du tarif « ${t.nom} ».` });
  const places = e.tarifs.reduce((n, t) => n + t.total, 0);
  if (places >= 1000) out.push({ texte: `Capacité importante : ${nombre(places)} places. Cohérente avec le lieu ?`, motif: "Vérifie la capacité annoncée par rapport au lieu." });
  const nbEvts = EVENEMENTS_ADMIN.filter((x) => x.organisateur === o.id).length;
  if (joursDepuis(o.inscritLe) <= 7 && nbEvts === 1)
    out.push({ texte: `Organisateur inscrit ${depuis(o.inscritLe)}, premier événement.`, motif: "Réponds-nous à contact@xwezan.com pour présenter ton organisation." });
  const dans = -joursDepuis(e.debut);
  if (dans <= 14) out.push({ texte: `L'événement a lieu dans ${dans} jours : la vente ne dure que jusque-là.`, motif: "" });
  return out.filter((c, i, l) => l.findIndex((x) => x.texte === c.texte) === i);
}

export default function V2AdminEvenements({ searchParams }: { searchParams: { statut?: string; etat?: string } }) {
  const filtre = FILTRES.find((f) => f.cle === searchParams.statut) ?? FILTRES[0];
  const vide = searchParams.etat === "vide";
  const liste = vide ? [] : EVENEMENTS_ADMIN.filter((e) => e.statut === filtre.statut).sort((a, b) => a.soumisLe.localeCompare(b.soumisLe));
  const compte = (st: Statut) => (vide ? 0 : EVENEMENTS_ADMIN.filter((e) => e.statut === st).length);
  const nbALaUne = EVENEMENTS_ADMIN.filter((e) => e.statut === "publie" && e.aLaUne).length;

  const aValider: EvenementAValider[] = liste.map((e) => {
    const o = organisateur(e.organisateur);
    return {
      id: e.id,
      titre: e.titre,
      orgaAffiche: nomAffiche(o),
      orgaPerso: o.nom,
      orgaEmail: o.email,
      debut: e.debut,
      fin: e.fin,
      heure: e.heure,
      lieu: e.lieu,
      ville: e.ville,
      soumis: depuis(e.soumisLe),
      categories: e.categories,
      description: e.description,
      tarifs: e.tarifs,
      image: e.image ? IMAGES[e.image] : null,
      controles: controles(e).map((c) => ({ ...c, motif: c.motif || c.texte })).filter((c) => c.motif),
    };
  });

  return (
    <Coquille nav={NAV_ADMIN} actif="evenements">
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>{filtre.cle === "attente" ? "Validation des événements" : "Événements"}</h1>
          <p className={s.sousTitre}>
            {filtre.cle === "attente"
              ? "Chaque événement soumis attend ton accord avant d'être mis en vente."
              : "Mise à la une, annulation et suppression des événements."}
          </p>
        </div>
      </div>

      <div className={s.puces} role="group" aria-label="Filtrer par statut" style={{ marginBottom: 16 }}>
        {FILTRES.map((f) => (
          <a
            key={f.cle}
            href={f.cle === "attente" ? `${A}/evenements` : `${A}/evenements?statut=${f.cle}`}
            className={`${s.puce} ${f.cle === filtre.cle ? s.puceOn : ""}`}
            aria-current={f.cle === filtre.cle ? "page" : undefined}
          >
            {f.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{compte(f.statut)}</span>
          </a>
        ))}
      </div>

      {liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name={filtre.cle === "attente" ? "check" : "calendar"} size={32} />
          <p className={s.videTitre}>{filtre.cle === "attente" ? "Aucun événement à valider" : `Aucun événement « ${filtre.libelle.toLowerCase()} »`}</p>
          <p className={s.videTexte}>
            {filtre.cle === "attente" ? "Les nouveaux événements soumis par les organisateurs apparaîtront ici." : "Rien à afficher pour ce statut."}
          </p>
        </div>
      ) : filtre.cle === "attente" ? (
        <Validation evenements={aValider} />
      ) : (
        <ul className={s.liste}>
          <li className={s.enteteListe} style={COLS} aria-hidden="true">
            <span>Événement</span>
            <span>Organisateur</span>
            <span>Vendus</span>
            <span>Ventes</span>
            <span>Statut</span>
            <span>Actions</span>
          </li>
          {liste.map((e) => {
            const c = chiffresAdmin(e);
            return (
              <li key={e.id} className={s.carte} style={COLS}>
                <div className={s.carteHaut}>
                  <div>
                    <p className={s.carteTitre}>{e.titre}</p>
                    <p className={s.carteMeta}>
                      {dateCourteOrga(e.debut, e.fin)} · {e.ville}
                    </p>
                    {e.motifRefus && <p className={s.carteMeta}>Motif : {e.motifRefus}</p>}
                  </div>
                  <span className={s.masqueDesktop}>
                    <StatutEvt statut={e.statut} />
                  </span>
                </div>
                <dl className={s.paires}>
                  <dt>Organisateur</dt>
                  <dd>{nomAffiche(organisateur(e.organisateur))}</dd>
                  <dt>Vendus</dt>
                  <dd className={s.chiffre}>
                    {nombre(c.vendus)} / {nombre(c.capacite)}
                  </dd>
                  <dt>Ventes</dt>
                  <dd className={s.chiffre}>{c.brut ? montant(c.brut) : "—"}</dd>
                </dl>
                <span className={s.cellule}>
                  <StatutEvt statut={e.statut} />
                </span>
                <Gestion titre={e.titre} statut={e.statut} vendus={c.vendus} brut={c.brut} aLaUneInitial={!!e.aLaUne} />
              </li>
            );
          })}
        </ul>
      )}

      <p className={s.note} style={{ marginTop: 16 }}>
        Statut affiché : {STATUTS[filtre.statut]}. {filtre.cle === "publie" ? `${nbALaUne} à la une sur l'accueil.` : ""}
      </p>
      <RubanEtats chemin={`${A}/evenements`} etats={["normal", "vide"]} />
    </Coquille>
  );
}
