"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import s from "../espace.module.css";
import Icon from "../Icon";
import { initialesArtiste } from "../orga/artistes/initiales";

/**
 * File admin des rattachements proposés (design/ARTISTES.md, lot 2) : pour
 * trancher quand le label ou le compte de l'artiste ne répond pas. Les plus
 * anciennes d'abord ; coordonnées de l'organisateur et de ceux qui doivent
 * décider, pour les relancer avant de trancher. Décision :
 * /api/admin/rattachements/decision. Copie dans la preview (v2/admin/artistes).
 */
export type Contact = { nom: string; role: string; email: string | null; tel: string | null };
export type PropositionAdmin = {
  cle: string;
  eventId: string;
  artisteId: string;
  artiste: string;
  photo: string | null;
  titre: string;
  lienEvenement: string | null;
  quand: string;
  ou: string;
  /** Ancienneté lisible (« il y a 9 jours ») et en jours, pour signaler les relances. */
  depuis: string;
  jours: number;
  organisateur: Contact;
  decideurs: Contact[];
};

type Action = "accepter" | "refuser";
/** Au-delà, la proposition est signalée « sans réponse » : c'est le moment de relancer ou de trancher. */
const JOURS_RELANCE = 7;

function Contacts({ c }: { c: Contact }) {
  return (
    <dd>
      {c.nom} <span className={s.note}>({c.role})</span>
      {c.email && (
        <a href={`mailto:${c.email}`} style={{ display: "block", textDecoration: "underline" }}>
          {c.email}
        </a>
      )}
      {c.tel && <span className={s.chiffre} style={{ display: "block" }}>{c.tel}</span>}
    </dd>
  );
}

export default function PropositionsArtistes({ propositions }: { propositions: PropositionAdmin[] }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, { action: Action; vue: PropositionAdmin; index: number }>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  // Une carte décidée reste affichée à sa place, avec le résultat, après le rafraîchissement.
  const affichees = useMemo(() => {
    const liste = [...propositions];
    for (const t of Object.values(decisions).sort((a, b) => a.index - b.index)) {
      if (!liste.some((x) => x.cle === t.vue.cle)) liste.splice(Math.min(t.index, liste.length), 0, t.vue);
    }
    return liste;
  }, [propositions, decisions]);
  const restantes = affichees.filter((x) => !decisions[x.cle]).length;

  async function decider(x: PropositionAdmin, action: Action) {
    setEnCours(`${x.cle}:${action}`);
    setErreurs((p) => ({ ...p, [x.cle]: "" }));
    let err: string | null = null;
    try {
      const res = await fetch("/api/admin/rattachements/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: x.eventId, artisteId: x.artisteId, action }),
      });
      if (!res.ok) err = (await res.json().catch(() => null))?.error ?? "Erreur";
    } catch {
      err = "Erreur réseau";
    }
    setEnCours(null);
    if (err) return setErreurs((p) => ({ ...p, [x.cle]: err! }));
    setDecisions((p) => ({ ...p, [x.cle]: { action, vue: x, index: affichees.findIndex((y) => y.cle === x.cle) } }));
    router.refresh();
  }

  if (affichees.length === 0) {
    return (
      <div className={s.vide}>
        <Icon name="check" size={32} />
        <p className={s.videTitre}>Aucune proposition en attente</p>
        <p className={s.videTexte}>
          Quand un organisateur met à l&apos;affiche un artiste qu&apos;il ne gère pas, son label ou l&apos;artiste décide. Les propositions restées sans réponse se tranchent ici.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className={s.note} aria-live="polite" style={{ marginBottom: 12 }}>
        {restantes === 0
          ? "File vide : toutes les propositions ont été traitées."
          : `${restantes} en attente, de la plus ancienne à la plus récente. Relance d'abord le label ou l'artiste ; tranche s'il ne répond pas.`}
      </p>
      <ul className={s.pile} style={{ gap: 16 }}>
        {affichees.map((x) => {
          const d = decisions[x.cle]?.action;
          const erreur = erreurs[x.cle];
          const relance = x.jours >= JOURS_RELANCE;
          return (
            <li key={x.cle} className={s.bloc}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {x.photo ? <img src={x.photo} alt="" /> : <span>{initialesArtiste(x.artiste)}</span>}
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 className={s.carteTitre} style={{ fontSize: 18, lineHeight: "24px" }}>
                    {x.artiste}
                    <span className={`${s.statut} ${relance ? s.stDanger : s.stAttente}`} style={{ marginLeft: 8, verticalAlign: "middle" }}>
                      {relance ? "Sans réponse" : "En attente"}
                    </span>
                  </h2>
                  <p className={s.carteMeta}>Proposé {x.depuis} à l&apos;affiche de :</p>
                  <p className={s.carteMeta}>
                    {x.lienEvenement ? (
                      <a href={x.lienEvenement} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "#fff" }}>
                        {x.titre}
                      </a>
                    ) : (
                      <b style={{ color: "#fff" }}>{x.titre}</b>
                    )}{" "}
                    · {x.quand} · {x.ou}
                    {x.lienEvenement ? "" : " · pas encore en ligne"}
                  </p>
                </div>
              </div>

              {d ? (
                <p className={`${s.alerte} ${d === "refuser" ? s.alerteDanger : ""}`} role="status" style={{ marginBottom: 0 }}>
                  <Icon name={d === "refuser" ? "x" : "check"} />
                  <span>
                    {d === "accepter"
                      ? `Accepté : ${x.artiste} s'affiche sur l'événement et l'événement sur sa page.`
                      : `Refusé : ${x.artiste} n'apparaîtra pas. ${x.organisateur.nom} le voit sur la fiche de son événement.`}
                  </span>
                </p>
              ) : (
                <>
                  <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                    <dt>Proposé par</dt>
                    <Contacts c={x.organisateur} />
                    <dt>Doit décider</dt>
                    {x.decideurs.length === 0 ? (
                      <dd>Aucun compte rattaché : à toi de trancher.</dd>
                    ) : (
                      x.decideurs.map((c, i) => <Contacts key={i} c={c} />)
                    )}
                  </dl>
                  {erreur && (
                    <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                      <Icon name="alert" />
                      <span>{erreur}</span>
                    </p>
                  )}
                  <div className={s.propositionActions}>
                    <button type="button" className={`${s.btn} ${s.btnGris}`} disabled={enCours !== null} onClick={() => decider(x, "refuser")}>
                      {enCours === `${x.cle}:refuser` ? "…" : "Refuser"}
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnOr}`} disabled={enCours !== null} onClick={() => decider(x, "accepter")}>
                      <Icon name="check" size={16} /> {enCours === `${x.cle}:accepter` ? "…" : "Accepter"}
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
