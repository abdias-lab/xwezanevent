"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { initialesArtiste } from "../orga/artistes/initiales";

export type DemandeArtiste = {
  id: string;
  /** creation : nouvelle page en validation ; renommage : page en ligne, nouveau nom demandé. */
  genre: "creation" | "renommage";
  nom: string;
  nomDemande: string | null;
  type: "label" | "auto_produit";
  label: string | null;
  bio: string;
  photo: string | null;
  liens: { libelle: string; url: string }[];
  soumis: string;
  demandeur: { nomAffiche: string; nomPerso: string; email: string | null; tel: string | null; whatsapp: string | null; verifie: boolean };
  /** Artistes en ligne portant déjà ce nom (normalisé). */
  homonymes: string[];
};

type Action = "valider" | "valider_verifier" | "refuser" | "accepter_nom" | "refuser_nom";
type Decision = { action: Action; motif: string };

const MOTIFS_CREATION = [
  "Nous n'avons pas pu joindre le demandeur pour la vérification.",
  "Les pièces reçues ne permettent pas de confirmer le lien avec l'artiste.",
  "Un artiste porte déjà ce nom sur XwézanEvent.",
  "Le nom de scène ne correspond pas aux réseaux indiqués.",
];
const MOTIFS_RENOMMAGE = ["Le nouveau nom ne correspond pas aux réseaux de l'artiste.", "Un artiste porte déjà ce nom sur XwézanEvent."];

/** Lien WhatsApp (wa.me) à partir d'un numéro saisi librement. */
const lienWhatsapp = (n: string) => `https://wa.me/${n.replace(/\D/g, "")}`;

/**
 * File de validation des artistes (design/ARTISTES.md), reprise de la
 * preview (v2/admin/artistes/ValidationArtistes.tsx) et branchée sur
 * POST /api/admin/artistes/[id]/decision, qui envoie l'e-mail au
 * demandeur. Comme la validation des événements : la carte traitée reste
 * affichée avec sa décision, la page serveur est rafraîchie pour les compteurs.
 */
export default function ValidationArtistes({ demandes }: { demandes: DemandeArtiste[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, { d: Decision; vue: DemandeArtiste; index: number }>>({});
  const [refus, setRefus] = useState<DemandeArtiste | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  const affiches = useMemo(() => {
    const liste = [...demandes];
    for (const t of Object.values(decisions).sort((a, b) => a.index - b.index)) {
      if (!liste.some((x) => x.id === t.vue.id)) liste.splice(Math.min(t.index, liste.length), 0, t.vue);
    }
    return liste;
  }, [demandes, decisions]);
  const restants = affiches.filter((x) => !decisions[x.id]).length;

  async function decider(x: DemandeArtiste, action: Action, motif = ""): Promise<string | null> {
    setEnCours(`${x.id}:${action}`);
    setErreurs((p) => ({ ...p, [x.id]: "" }));
    let err: string | null = null;
    try {
      const res = await fetch(`/api/admin/artistes/${x.id}/decision`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, motif }) });
      if (!res.ok) err = (await res.json().catch(() => null))?.error ?? "Erreur";
    } catch {
      err = "Erreur réseau";
    }
    setEnCours(null);
    if (err) {
      setErreurs((p) => ({ ...p, [x.id]: err! }));
      return err;
    }
    const index = affiches.findIndex((y) => y.id === x.id);
    setDecisions((p) => ({ ...p, [x.id]: { d: { action, motif }, vue: x, index } }));
    setRefus(null);
    router.refresh();
    return null;
  }

  const libelleDecision = (x: DemandeArtiste, d: Decision) =>
    d.action === "valider"
      ? `Validé, en ligne. ${x.demandeur.nomAffiche} reçoit l'e-mail « la page artiste est en ligne ».`
      : d.action === "valider_verifier"
        ? `Validé, en ligne, et compte de ${x.demandeur.nomAffiche} vérifié : ses prochaines créations seront publiées directement.`
        : d.action === "accepter_nom"
          ? `Nouveau nom validé : la page s'affiche sous « ${x.nomDemande} ».`
          : d.action === "refuser_nom"
            ? `Nouveau nom refusé${d.motif ? ` (motif envoyé : « ${d.motif} »)` : ""}. La page garde « ${x.nom} ».`
            : `Refusé. ${d.motif ? `Motif envoyé : « ${d.motif} »` : "E-mail envoyé sans motif."}`;

  return (
    <>
      <p className={s.note} aria-live="polite" style={{ marginBottom: 12 }}>
        {restants === 0 ? "File vide : toutes les demandes ont été traitées." : `${restants} à traiter, de la plus ancienne à la plus récente.`}
      </p>
      <ul className={s.pile} style={{ gap: 16 }}>
        {affiches.map((x) => {
          const d = decisions[x.id]?.d;
          const erreur = erreurs[x.id];
          const occupe = enCours !== null;
          return (
            <li key={x.id} className={s.bloc}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  {x.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={x.photo} alt="" />
                  ) : (
                    <span>{initialesArtiste(x.nom)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className={s.carteTitre} style={{ fontSize: 18, lineHeight: "24px" }}>
                    {x.genre === "renommage" ? (
                      <>
                        {x.nom} <span className={s.note}>→</span> {x.nomDemande}
                      </>
                    ) : (
                      x.nom
                    )}
                    <span className={`${s.statut} ${x.genre === "renommage" ? s.stNeutre : s.stAttente}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      {x.genre === "renommage" ? "Changement de nom" : "Nouvelle page"}
                    </span>
                  </h2>
                  <p className={s.carteMeta}>
                    {x.type === "auto_produit" ? "Artiste auto-produit" : `Artiste du label ${x.label ?? "—"}`} · soumis {x.soumis}
                  </p>
                </div>
              </div>

              {d ? (
                <p className={`${s.alerte} ${d.action === "refuser" || d.action === "refuser_nom" ? s.alerteDanger : ""}`} role="status" style={{ marginBottom: 0 }}>
                  <Icon name={d.action === "refuser" || d.action === "refuser_nom" ? "x" : "check"} />
                  <span>{libelleDecision(x, d)}</span>
                </p>
              ) : (
                <>
                  <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                    <dt>Demandeur</dt>
                    <dd>
                      {x.demandeur.nomAffiche}
                      {x.demandeur.nomAffiche !== x.demandeur.nomPerso ? ` (${x.demandeur.nomPerso})` : ""}
                      {x.demandeur.verifie && (
                        <span className={`${s.statut} ${s.stVerifie}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                          Vérifié
                        </span>
                      )}
                    </dd>
                    <dt>WhatsApp</dt>
                    <dd>
                      {x.demandeur.whatsapp ? (
                        <a href={lienWhatsapp(x.demandeur.whatsapp)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
                          {x.demandeur.whatsapp}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                    <dt>E-mail</dt>
                    <dd>
                      {x.demandeur.email ? (
                        <a href={`mailto:${x.demandeur.email}`} style={{ textDecoration: "underline" }}>
                          {x.demandeur.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                    <dt>Téléphone</dt>
                    <dd className={s.chiffre}>{x.demandeur.tel ?? "—"}</dd>
                    <dt>Réseaux</dt>
                    <dd>
                      {x.liens.length === 0
                        ? "Aucun"
                        : x.liens.map((l) => (
                            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "underline" }}>
                              {l.libelle}
                            </a>
                          ))}
                    </dd>
                  </dl>
                  {x.genre === "creation" && x.bio && (
                    <div>
                      <p className={s.etiquette}>Bio</p>
                      <p style={{ fontSize: 14, lineHeight: "20px", color: "var(--muted)", whiteSpace: "pre-line" }}>{x.bio}</p>
                    </div>
                  )}
                  {x.homonymes.length > 0 ? (
                    <div className={s.panneau} style={{ background: "var(--hover)" }}>
                      <p className={s.panneauTitre}>Point à vérifier</p>
                      <ul className={s.checklist}>
                        <li style={{ color: "#fff", alignItems: "flex-start" }}>
                          <Icon name="alert" size={16} className={s.montantOr} />
                          <span>Un artiste en ligne porte déjà ce nom : {x.homonymes.join(", ")}. Vérifie qu&apos;il ne s&apos;agit pas d&apos;une usurpation.</span>
                        </li>
                      </ul>
                    </div>
                  ) : x.genre === "creation" ? (
                    <p className={s.note} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Icon name="shield" size={16} /> Contacte le demandeur pour ses pièces : {x.type === "label" ? "statuts et mandat du label" : "pièce d'identité et réseaux"}.
                    </p>
                  ) : null}
                  {erreur && (
                    <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                      <Icon name="alert" />
                      <span>{erreur}</span>
                    </p>
                  )}
                  {/* Jusqu'à trois boutons : ligne flexible (la grille .actionsValidation n'en prévoit que deux). */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ flex: "1 1 auto" }} disabled={occupe} onClick={() => setRefus(x)}>
                      <Icon name="x" /> {x.genre === "renommage" ? "Refuser le nom" : "Refuser"}
                    </button>
                    {x.genre === "renommage" ? (
                      <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: "1 1 auto" }} disabled={occupe} onClick={() => decider(x, "accepter_nom")}>
                        <Icon name="check" /> {enCours === `${x.id}:accepter_nom` ? "Enregistrement…" : "Accepter le nom"}
                      </button>
                    ) : (
                      <>
                        <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ flex: "1 1 auto" }} disabled={occupe} onClick={() => decider(x, "valider")}>
                          <Icon name="check" /> {enCours === `${x.id}:valider` ? "Publication…" : "Valider"}
                        </button>
                        {!x.demandeur.verifie && (
                          <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: "1 1 auto" }} disabled={occupe} onClick={() => decider(x, "valider_verifier")}>
                            <Icon name="shield" /> {enCours === `${x.id}:valider_verifier` ? "Publication…" : "Valider et vérifier le compte"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {refus && <FeuilleRefus x={refus} onFermer={() => setRefus(null)} onRefuser={(motif) => decider(refus, refus.genre === "renommage" ? "refuser_nom" : "refuser", motif)} />}
    </>
  );
}

function FeuilleRefus({ x, onFermer, onRefuser }: { x: DemandeArtiste; onFermer: () => void; onRefuser: (motif: string) => Promise<string | null> }) {
  const [motif, setMotif] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const motifs = x.genre === "renommage" ? MOTIFS_RENOMMAGE : MOTIFS_CREATION;
  const ajouter = (m: string) => setMotif((prev) => (prev.includes(m) ? prev : prev.trim() ? `${prev.trim()} ${m}` : m));

  async function confirmer() {
    setEnCours(true);
    setErreur(null);
    const err = await onRefuser(motif.trim());
    if (err) {
      setErreur(err);
      setEnCours(false);
    }
  }

  return (
    <div className={s.fond} onClick={() => !enCours && onFermer()}>
      <div className={s.feuille} role="dialog" aria-modal="true" aria-labelledby={`titre-refus-${x.id}`} onClick={(e) => e.stopPropagation()}>
        <h2 id={`titre-refus-${x.id}`} className={s.feuilleTitre}>
          {x.genre === "renommage" ? `Refuser le nom « ${x.nomDemande} » ?` : `Refuser « ${x.nom} » ?`}
        </h2>
        <p className={s.feuilleTexte}>
          {x.genre === "renommage" ? `La page garde le nom « ${x.nom} ». ` : "La page reste invisible du public. "}
          {x.demandeur.nomAffiche} reçoit un e-mail avec ce motif et peut corriger sa demande.
        </p>
        <div className={s.puces} role="group" aria-label="Motifs fréquents">
          {motifs.map((m) => (
            <button key={m} type="button" className={s.puce} style={{ height: "auto", minHeight: 40, padding: "8px 16px", textAlign: "left", lineHeight: "18px" }} onClick={() => ajouter(m)}>
              {m}
            </button>
          ))}
        </div>
        <div className={s.champ}>
          <label htmlFor={`motif-${x.id}`}>
            Motif <small>(facultatif, envoyé au demandeur)</small>
          </label>
          <textarea id={`motif-${x.id}`} value={motif} maxLength={1000} onChange={(e) => setMotif(e.target.value)} style={{ minHeight: 96 }} />
        </div>
        {erreur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert">
            <Icon name="alert" />
            <span>{erreur}</span>
          </p>
        )}
        <div className={s.feuilleActions}>
          <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={enCours} onClick={onFermer}>
            Retour
          </button>
          <button type="button" className={`${s.btn} ${s.btnDanger} ${s.btnGrand}`} disabled={enCours} onClick={confirmer}>
            {enCours ? "Envoi…" : x.genre === "renommage" ? "Refuser le nom" : "Refuser la page"}
          </button>
        </div>
      </div>
    </div>
  );
}
