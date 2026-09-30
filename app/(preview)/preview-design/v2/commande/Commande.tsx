"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";
import { fcfa } from "../../_data";

export type TarifCommande = { id: string; nom: string; detail: string; prix: number; disponibles: number };
type Compte = { nom: string; email: string; tel: string } | null;
type Phase = "saisie" | "envoi" | "redirection";

const MAX_PAR_TARIF = 10; // limite de la preview (la prod plafonne au stock disponible)

/**
 * Commande (preview V2). En prod, tout se passe dans components/Billetterie.tsx
 * sur la page de l'événement : quantités, choix « se connecter » ou « sans
 * compte », coordonnées de l'invité, POST /api/orders, puis redirection vers
 * FedaPay (ou directement /confirmation si tout est gratuit). Ici : page dédiée,
 * panier dans l'URL (conservé si l'acheteur passe par la connexion).
 */
export default function Commande({
  titre,
  quand,
  lieu,
  tarifs,
  initial,
  compte,
  erreurStock,
}: {
  titre: string;
  quand: string;
  lieu: string;
  tarifs: TarifCommande[];
  initial: Record<string, number>;
  compte: Compte;
  erreurStock: boolean;
}) {
  const [q, setQ] = useState<Record<string, number>>(initial);
  const [mode, setMode] = useState<"compte" | "invite" | null>(compte ? "compte" : null);
  const [nom, setNom] = useState(compte?.nom ?? "");
  const [email, setEmail] = useState(compte?.email ?? "");
  const [tel, setTel] = useState(compte?.tel ?? "");
  const [tente, setTente] = useState(false);
  const [phase, setPhase] = useState<Phase>("saisie");

  const lignes = tarifs.filter((t) => (q[t.id] ?? 0) > 0);
  const nb = lignes.reduce((n, t) => n + q[t.id], 0);
  const total = lignes.reduce((n, t) => n + q[t.id] * t.prix, 0);
  const gratuit = nb > 0 && total === 0;
  const change = (t: TarifCommande, d: number) =>
    setQ((p) => ({ ...p, [t.id]: Math.max(0, Math.min(Math.min(MAX_PAR_TARIF, t.disponibles), (p[t.id] ?? 0) + d)) }));

  const nomOk = nom.trim().length > 1;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const chiffres = tel.replace(/\D/g, "");
  const telOk = chiffres.length === 8 || (chiffres.length === 10 && chiffres.startsWith("01")) || (chiffres.length === 13 && chiffres.startsWith("22901"));
  const coordonneesOk = nomOk && emailOk && telOk;
  const panier = new URLSearchParams(Object.fromEntries(lignes.map((t) => [t.id, String(q[t.id])]))).toString();
  const retour = `${B}/commande${panier ? `?${panier}` : ""}`;

  function payer() {
    setTente(true);
    if (nb === 0 || !mode || !coordonneesOk) return;
    setPhase("envoi");
    setTimeout(() => setPhase("redirection"), 800);
  }

  const libelle = phase === "envoi" ? "Un instant…" : gratuit ? "Réserver gratuitement" : nb === 0 ? "Choisis tes billets" : `Payer ${fcfa(total)}`;
  const champ = (ok: boolean) => `${s.champ} ${tente && !ok ? s.champErreur : ""}`;

  if (phase === "redirection") {
    return (
      <div className={s.vide} role="status" style={{ maxWidth: 520 }}>
        <Icon name="phone" size={48} className={s.montantOr} />
        <p className={s.videTitre}>{gratuit ? "Réservation confirmée" : "Direction FedaPay…"}</p>
        <p className={s.videTexte}>
          {gratuit
            ? "Tes billets gratuits sont prêts. Tu les reçois aussi par e-mail."
            : `Tu vas valider ${fcfa(total)} sur FedaPay, notre partenaire de paiement. Garde ton téléphone ${tel.trim()} à portée : une demande de validation Mobile Money va t'arriver.`}
        </p>
        <a href={gratuit ? `${B}/confirmation` : `${B}/paiement/retour`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
          Preview : {gratuit ? "voir la confirmation" : "simuler le retour de FedaPay"}
        </a>
      </div>
    );
  }

  return (
    <div className={s.form}>
      <div className={s.formCorps}>
        {erreurStock && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>Il ne reste que 3 places en « Table 6 personnes ». Ajuste ta commande, rien n&apos;a été payé.</span>
          </p>
        )}

        <section className={s.bloc} aria-labelledby="c1">
          <div className={s.blocTete}>
            <span className={`${s.num} ${nb > 0 ? s.numFait : ""}`} aria-hidden="true">
              {nb > 0 ? <Icon name="check" size={16} /> : 1}
            </span>
            <h2 id="c1" className={s.blocTitre}>
              Tes billets
            </h2>
          </div>
          <ul className={s.pile} style={{ gap: 8 }}>
            {tarifs.map((t) => {
              const n = q[t.id] ?? 0;
              const epuise = t.disponibles === 0;
              return (
                <li key={t.id} className={s.verrou} style={{ justifyContent: "space-between", color: "inherit", boxShadow: n > 0 ? "inset 0 0 0 1.5px var(--or)" : undefined }}>
                  <span>
                    <b>{t.nom}</b>
                    <span className={s.note} style={{ display: "block" }}>
                      {t.detail}
                    </span>
                    <span className={s.chiffre} style={{ display: "block", fontWeight: 700 }}>
                      {fcfa(t.prix)}
                      {!epuise && t.disponibles <= 10 && <span className={s.note}> · plus que {t.disponibles}</span>}
                    </span>
                  </span>
                  {epuise ? (
                    <span className={`${s.statut} ${s.stBarre}`}>Épuisé</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" className={`${s.btn} ${s.btnGris}`} style={{ width: 44, padding: 0 }} aria-label={`Retirer un billet ${t.nom}`} disabled={n === 0} onClick={() => change(t, -1)}>
                        <Icon name="minus" />
                      </button>
                      <span className={s.chiffre} style={{ minWidth: 20, textAlign: "center", fontWeight: 700 }} aria-live="polite">
                        {n}
                      </span>
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnGris}`}
                        style={{ width: 44, padding: 0 }}
                        aria-label={`Ajouter un billet ${t.nom}`}
                        disabled={n >= Math.min(MAX_PAR_TARIF, t.disponibles)}
                        onClick={() => change(t, 1)}
                      >
                        <Icon name="plus" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          {tente && nb === 0 && <span className={s.erreur}>Choisis au moins un billet.</span>}
        </section>

        <section className={s.bloc} aria-labelledby="c2">
          <div className={s.blocTete}>
            <span className={`${s.num} ${mode && coordonneesOk ? s.numFait : ""}`} aria-hidden="true">
              {mode && coordonneesOk ? <Icon name="check" size={16} /> : 2}
            </span>
            <h2 id="c2" className={s.blocTitre}>
              Tes coordonnées
            </h2>
          </div>

          {!mode ? (
            <>
              <p className={s.aide} style={{ fontSize: 14, lineHeight: "20px" }}>
                Tes billets t&apos;arrivent par e-mail. Un compte n&apos;est pas obligatoire.
              </p>
              <div className={s.deux} style={{ gridTemplateColumns: "1fr" }}>
                <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} onClick={() => setMode("invite")}>
                  Continuer sans compte
                </button>
                <a href={`${B}/connexion?redirect=${encodeURIComponent(retour)}`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                  J&apos;ai un compte, me connecter
                </a>
              </div>
              <p className={s.note}>Ton panier est gardé si tu te connectes.</p>
              {tente && <span className={s.erreur}>Choisis comment continuer.</span>}
            </>
          ) : (
            <>
              {mode === "compte" && (
                <p className={s.note} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="check" size={16} /> Connecté : tes billets seront aussi dans ton compte.
                </p>
              )}
              <div className={champ(nomOk)}>
                <label htmlFor="nom">Nom sur les billets</label>
                <input id="nom" autoComplete="name" value={nom} placeholder="Prénom Nom" aria-invalid={tente && !nomOk} onChange={(e) => setNom(e.target.value)} />
                {tente && !nomOk && <span className={s.erreur}>Indique ton prénom et ton nom.</span>}
              </div>
              <div className={champ(emailOk)}>
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  placeholder="ton@email.com"
                  readOnly={mode === "compte"}
                  aria-invalid={tente && !emailOk}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {tente && !emailOk ? <span className={s.erreur}>Indique une adresse e-mail valide.</span> : <span className={s.aide}>Tes billets arrivent à cette adresse.</span>}
              </div>
              <div className={champ(telOk)}>
                <label htmlFor="tel">
                  Numéro Mobile Money <small>(celui qui paie)</small>
                </label>
                <input id="tel" type="tel" inputMode="tel" autoComplete="tel" value={tel} placeholder="01 97 00 00 00" aria-invalid={tente && !telOk} onChange={(e) => setTel(e.target.value)} />
                {tente && !telOk ? (
                  <span className={s.erreur}>10 chiffres commençant par 01, ou 8 chiffres.</span>
                ) : (
                  <span className={s.aide}>Il sert aussi en cas de remboursement.</span>
                )}
              </div>
              {mode === "invite" && !compte && (
                <button
                  type="button"
                  className={s.note}
                  style={{ background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer", justifySelf: "start" }}
                  onClick={() => setMode(null)}
                >
                  Finalement, me connecter
                </button>
              )}
            </>
          )}
        </section>
      </div>

      <aside className={s.cote}>
        <Recap titre={titre} quand={quand} lieu={lieu} lignes={lignes} q={q} total={total} />
        <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={phase === "envoi"} onClick={payer}>
          <Icon name={gratuit ? "ticket" : "phone"} /> {libelle}
        </button>
        <Rassurance />
      </aside>

      <section className={s.seulMobile} style={{ display: "grid", gap: 12 }}>
        <Recap titre={titre} quand={quand} lieu={lieu} lignes={lignes} q={q} total={total} />
        <Rassurance />
      </section>

      <div className={`${s.barreBas} ${s.masqueDesktop}`} style={{ inset: "auto 0 0 0", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }}>
        <span className={s.barreBasInfo}>
          {nb > 0 ? `${nb} billet${nb > 1 ? "s" : ""}` : "Aucun billet"}
          <b style={{ display: "block", color: "#fff", fontSize: 16 }}>{nb > 0 ? fcfa(total) : "—"}</b>
        </span>
        <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: 1 }} aria-disabled={phase === "envoi"} onClick={payer}>
          {libelle}
        </button>
      </div>
      <div className={s.espaceBarreBas} aria-hidden="true" />
    </div>
  );
}

function Recap({ titre, quand, lieu, lignes, q, total }: { titre: string; quand: string; lieu: string; lignes: TarifCommande[]; q: Record<string, number>; total: number }) {
  return (
    <div className={s.panneau}>
      <p className={s.panneauTitre}>Récapitulatif</p>
      <p style={{ fontWeight: 700 }}>{titre}</p>
      <p className={s.note} style={{ marginBottom: 12 }}>
        {quand} · {lieu}
      </p>
      {lignes.length === 0 ? (
        <p className={s.note}>Aucun billet choisi.</p>
      ) : (
        <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
          {lignes.map((t) => (
            <div key={t.id} style={{ display: "contents" }}>
              <dt>
                {q[t.id]} × {t.nom}
              </dt>
              <dd className={s.chiffre} style={{ textAlign: "right" }}>
                {fcfa(q[t.id] * t.prix)}
              </dd>
            </div>
          ))}
          <dt style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Total</dt>
          <dd className={`${s.chiffre} ${s.montantOr}`} style={{ textAlign: "right", fontSize: 18 }}>
            {fcfa(total)}
          </dd>
        </dl>
      )}
    </div>
  );
}

function Rassurance() {
  return (
    <ul className={s.checklist} style={{ fontSize: 13 }}>
      <li>
        <Icon name="shield" size={16} /> Paiement sécurisé par FedaPay
      </li>
      <li>
        <Icon name="qr" size={16} /> Billet QR par e-mail, dès le paiement validé
      </li>
    </ul>
  );
}
