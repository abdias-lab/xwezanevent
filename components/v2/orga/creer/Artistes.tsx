"use client";

import { useEffect, useRef, useState } from "react";
import s from "../../espace.module.css";
import Icon from "../../Icon";
import { initialesArtiste } from "../artistes/initiales";

/**
 * Sélecteur des artistes à l'affiche d'un événement (design/ARTISTES.md,
 * lot 2). Même composant dans la preview (v2/creer/Artistes.tsx, recherche
 * factice) et en prod (recherche serveur `chercherArtistes`).
 *
 * - Un artiste que le compte gère est rattaché tout de suite ; un autre
 *   artiste (validé) est « proposé » : invisible jusqu'à l'accord de son label,
 *   de son compte ou de l'admin.
 * - « Demander sa page » : nouvel artiste créé à l'envoi de l'événement, pas
 *   avant (rien d'orphelin si l'organisateur abandonne). Bio, photo et réseaux
 *   se complètent ensuite dans Mes artistes.
 * - Ordre d'affichage = ordre d'ajout.
 */

export const MAX_ARTISTES = 10; // lib/artistes.ts, MAX_ARTISTES_EVENEMENT
const NOM_MAX = 80;

export type ArtisteTrouve = { id: string; nom: string; photo: string | null; statut: "en_validation" | "valide" | "refuse" | "retire"; gere: boolean };
type TypeDemande = "label" | "auto_produit";
export type ArtisteChoisi = { cle: string } & (
  // `rattache` : déjà sur l'événement (modification), avec son statut en base
  // et `le`, date lisible de la proposition ou du refus.
  | { trouve: ArtisteTrouve; rattache?: "accepte" | "propose" | "refuse"; le?: string | null }
  | { nouveau: { nom: string; type: TypeDemande; whatsapp: string } }
);

/** Valeur du champ caché « artistes » lu par preparerArtistes (lib/artistes.ts). */
export const valeurArtistes = (choisis: ArtisteChoisi[]) =>
  JSON.stringify(choisis.map((c) => ("trouve" in c ? { id: c.trouve.id } : { nouveau: c.nouveau })));

const whatsappValide = (w: string) => /\d{6,}/.test(w.replace(/\D/g, "")) && w.trim().length <= 30;

function Avatar({ nom, photo }: { nom: string; photo: string | null }) {
  return (
    <span className={`${s.avatarArtiste} ${s.avatarPetit}`} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo ? <img src={photo} alt="" /> : initialesArtiste(nom)}
    </span>
  );
}

function sousTitre(c: ArtisteChoisi, verifie: boolean): string {
  if ("nouveau" in c) {
    return verifie
      ? "Nouvelle page, publiée dès l'enregistrement. Complète sa photo et sa bio dans Mes artistes."
      : "Nouvelle page : l'équipe te contacte sur WhatsApp pour la vérifier. Son nom s'affiche en attendant.";
  }
  const a = c.trouve;
  // Retiré par l'équipe : la ligne reste, l'artiste est masqué, réversible.
  if (a.statut === "retire") return "Retiré par l'équipe : il n'apparaît pas sur l'événement.";
  // Refusé après son rattachement : la ligne reste, l'artiste est masqué (design/ARTISTES.md).
  if (a.statut === "refuse") return a.gere ? "Page refusée : il n'apparaît pas. Corrige sa page dans Mes artistes, ou retire-le." : "Page indisponible : il n'apparaît pas sur l'événement.";
  if (c.rattache === "refuse") return `Refusé par son label ou l'artiste${c.le ? ` le ${c.le}` : ""} : il n'apparaît pas. Retire-le de la liste.`;
  if (c.rattache === "propose") return `En attente de réponse de son label ou de l'artiste${c.le ? `, proposé le ${c.le}` : ""}.`;
  if (!a.gere) return c.rattache === "accepte" ? "Accepté par son label ou l'artiste." : "Proposé : s'affiche après l'accord de son label ou de l'artiste.";
  return a.statut === "valide" ? "Ton artiste" : "Page en vérification : son nom s'affiche, sans lien, en attendant.";
}

export default function Artistes({
  choisis,
  setChoisis,
  chercher,
  verifie,
  peutMoiMeme,
}: {
  choisis: ArtisteChoisi[];
  setChoisis: (f: (prev: ArtisteChoisi[]) => ArtisteChoisi[]) => void;
  chercher: (q: string) => Promise<ArtisteTrouve[]>;
  verifie: boolean;
  /** Le compte n'a pas encore sa propre page artiste. */
  peutMoiMeme: boolean;
}) {
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [resultats, setResultats] = useState<ArtisteTrouve[] | null>(null);
  const [demande, setDemande] = useState<{ nom: string; type: TypeDemande | null; whatsapp: string; tente: boolean } | null>(null);
  const requete = useRef(0);
  const zone = useRef<HTMLDivElement>(null);

  // Recherche (250 ms après la frappe) ; une réponse en retard est ignorée.
  useEffect(() => {
    if (!ouvert) return;
    const n = ++requete.current;
    const t = setTimeout(() => {
      chercher(q).then(
        (r) => n === requete.current && setResultats(r),
        () => n === requete.current && setResultats([]),
      );
    }, 250);
    return () => clearTimeout(t);
  }, [q, ouvert, chercher]);

  const dejaChoisis = new Set(choisis.flatMap((c) => ("trouve" in c ? [c.trouve.id] : [])));
  const visibles = (resultats ?? []).filter((r) => !dejaChoisis.has(r.id));
  const moiMemeDispo = peutMoiMeme && !choisis.some((c) => "nouveau" in c && c.nouveau.type === "auto_produit");
  const plein = choisis.length >= MAX_ARTISTES;

  const ajouter = (c: ArtisteChoisi) => {
    setChoisis((prev) => (prev.length >= MAX_ARTISTES ? prev : [...prev, c]));
    setQ("");
    setResultats(null);
    setOuvert(false);
  };
  const ouvrirDemande = () => {
    setDemande({ nom: q.trim().slice(0, NOM_MAX), type: moiMemeDispo ? null : "label", whatsapp: "", tente: false });
    setOuvert(false);
  };
  const demandeOk = !!demande && !!demande.nom.trim() && !!demande.type && (verifie || whatsappValide(demande.whatsapp));
  const validerDemande = () => {
    if (!demande) return;
    if (!demandeOk) return setDemande({ ...demande, tente: true });
    ajouter({ cle: `n${Date.now()}`, nouveau: { nom: demande.nom.trim(), type: demande.type!, whatsapp: verifie ? "" : demande.whatsapp.trim() } });
    setDemande(null);
  };
  // Entrée dans un champ du sous-formulaire : jamais l'envoi de l'événement.
  const entreeSansEnvoi = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className={s.champ}>
      <label htmlFor="artiste-recherche">
        Artistes à l&apos;affiche <small>(facultatif)</small>
      </label>

      {choisis.length > 0 && (
        <ul className={s.artistesChoisis} aria-label="Artistes choisis">
          {choisis.map((c) => {
            const nom = "trouve" in c ? c.trouve.nom : c.nouveau.nom;
            return (
              <li key={c.cle} className={s.artisteLigne}>
                <Avatar nom={nom} photo={"trouve" in c ? c.trouve.photo : null} />
                <span className={s.artisteTexte}>
                  <b>{nom}</b>
                  <small>{sousTitre(c, verifie)}</small>
                </span>
                <button type="button" className={s.iconeBtn} aria-label={`Retirer ${nom}`} onClick={() => setChoisis((prev) => prev.filter((x) => x.cle !== c.cle))}>
                  <Icon name="x" size={20} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {demande ? (
        <div className={s.artisteDemande} role="group" aria-labelledby="demande-titre">
          <p id="demande-titre" className={s.artisteDemandeTitre}>
            Demander une page artiste
          </p>
          <div className={`${s.champ} ${demande.tente && !demande.nom.trim() ? s.champErreur : ""}`}>
            <label htmlFor="demande-nom">Nom de scène</label>
            <input
              id="demande-nom"
              type="text"
              maxLength={NOM_MAX}
              value={demande.nom}
              aria-invalid={demande.tente && !demande.nom.trim()}
              onChange={(e) => setDemande({ ...demande, nom: e.target.value })}
              onKeyDown={(e) => entreeSansEnvoi(e, validerDemande)}
            />
            {demande.tente && !demande.nom.trim() && <span className={s.erreur}>Indique son nom de scène.</span>}
          </div>
          <div className={s.champ}>
            <span className={s.etiquette} id="demande-pour">
              Pour qui ?
            </span>
            <div className={s.puces} role="group" aria-labelledby="demande-pour">
              <button
                type="button"
                className={`${s.puce} ${demande.type === "auto_produit" ? s.puceOn : ""}`}
                aria-pressed={demande.type === "auto_produit"}
                disabled={!moiMemeDispo}
                onClick={() => setDemande({ ...demande, type: "auto_produit" })}
              >
                Moi-même, artiste auto-produit
              </button>
              <button type="button" className={`${s.puce} ${demande.type === "label" ? s.puceOn : ""}`} aria-pressed={demande.type === "label"} onClick={() => setDemande({ ...demande, type: "label" })}>
                Un artiste de mon label
              </button>
            </div>
            {!peutMoiMeme && <span className={s.aide}>Tu as déjà ta page artiste : cherche-la plus haut.</span>}
            {demande.tente && !demande.type && <span className={s.erreur}>Choisis pour qui est cette page.</span>}
          </div>
          {!verifie && (
            <div className={`${s.champ} ${demande.tente && !whatsappValide(demande.whatsapp) ? s.champErreur : ""}`}>
              <label htmlFor="demande-whatsapp">WhatsApp</label>
              <input
                id="demande-whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+229 01 23 45 67 89"
                maxLength={30}
                value={demande.whatsapp}
                aria-invalid={demande.tente && !whatsappValide(demande.whatsapp)}
                aria-describedby="demande-whatsapp-aide"
                onChange={(e) => setDemande({ ...demande, whatsapp: e.target.value })}
                onKeyDown={(e) => entreeSansEnvoi(e, validerDemande)}
              />
              {demande.tente && !whatsappValide(demande.whatsapp) ? (
                <span id="demande-whatsapp-aide" className={s.erreur}>
                  Indique un numéro WhatsApp valide, avec l&apos;indicatif du pays.
                </span>
              ) : (
                <span id="demande-whatsapp-aide" className={s.aide}>
                  La vérification protège les artistes contre l&apos;usurpation de leur nom : l&apos;équipe te contacte sur ce numéro.
                </span>
              )}
            </div>
          )}
          <div className={s.artisteDemandeActions}>
            <button type="button" className={`${s.btn} ${s.btnGris}`} onClick={() => setDemande(null)}>
              Annuler
            </button>
            <button type="button" className={`${s.btn} ${s.btnOr}`} onClick={validerDemande}>
              Ajouter
            </button>
          </div>
        </div>
      ) : plein ? (
        <span className={s.aide}>{MAX_ARTISTES} artistes au plus.</span>
      ) : (
        <div
          ref={zone}
          onBlur={(e) => {
            if (!zone.current?.contains(e.relatedTarget as Node | null)) setOuvert(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOuvert(false);
          }}
        >
          <div className={s.artisteRecherche}>
            <Icon name="search" size={20} />
            <input
              id="artiste-recherche"
              type="search"
              placeholder="Chercher un artiste"
              autoComplete="off"
              maxLength={NOM_MAX}
              value={q}
              aria-controls="artiste-resultats"
              onFocus={() => setOuvert(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOuvert(true);
              }}
              onKeyDown={(e) => entreeSansEnvoi(e, () => (visibles[0] ? ajouter({ cle: visibles[0].id, trouve: visibles[0] }) : q.trim() && ouvrirDemande()))}
            />
          </div>
          {/* Liste seulement si elle a quelque chose à montrer : sans artiste en base, une
              requête vide ne renvoie rien et laissait une barre vide sous le champ. */}
          {ouvert && (visibles.length > 0 || q.trim()) && (
            <ul id="artiste-resultats" className={s.artisteResultats} aria-label="Résultats">
              {!q.trim() && visibles.length > 0 && <li className={s.artisteResultatsTitre}>Tes artistes</li>}
              {visibles.map((r) => (
                <li key={r.id}>
                  <button type="button" className={s.artisteResultat} onClick={() => ajouter({ cle: r.id, trouve: r })}>
                    <Avatar nom={r.nom} photo={r.photo} />
                    <span className={s.artisteTexte}>
                      <b>{r.nom}</b>
                      <small>{r.gere ? (r.statut === "valide" ? "Ton artiste" : "Ton artiste · en vérification") : "Proposé à son label ou à l'artiste"}</small>
                    </span>
                    <Icon name="plus" size={20} />
                  </button>
                </li>
              ))}
              {q.trim() && resultats !== null && visibles.length === 0 && <li className={s.artisteResultatsTitre}>Aucun artiste trouvé</li>}
              {q.trim() && (
                <li>
                  <button type="button" className={s.artisteResultat} onClick={ouvrirDemande}>
                    <span className={`${s.avatarArtiste} ${s.avatarPetit}`} aria-hidden="true">
                      <Icon name="plus" size={20} />
                    </span>
                    <span className={s.artisteTexte}>
                      <b>Demander la page « {q.trim()} »</b>
                      <small>Il n&apos;a pas encore de page sur Xwézan</small>
                    </span>
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <span className={s.aide}>
        Tes artistes apparaissent sur l&apos;événement dès sa mise en ligne. Les autres sont proposés à leur label ou à l&apos;artiste, et s&apos;affichent après leur accord.
      </span>
    </div>
  );
}
