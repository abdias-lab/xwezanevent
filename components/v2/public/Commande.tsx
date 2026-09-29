"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../Icon";
import { fcfa, MAX_PAR_TARIF } from "./evenement";
import { aidePays, exemplePays, normaliserNumero } from "@/lib/telephone";

export type TarifCommande = { id: string; nom: string; prix: number; disponibles: number };
type Compte = { nom: string; email: string } | null;
type Phase = "saisie" | "envoi" | "redirection";
type Erreur = { texte: string; lien?: { href: string; libelle: string } } | null;

/**
 * Commande (V2), reprise de la preview (v2/commande/Commande.tsx) :
 * quantités, « sans compte » ou connexion, coordonnées de l'invité, POST
 * /api/orders, puis FedaPay (ou directement /confirmation si tout est
 * gratuit). Connecté : nom et e-mail du compte, sans téléphone (une
 * commande liée à un compte n'en porte pas, contrainte
 * orders_identite_acheteur). Invité : téléphone validé selon le pays de
 * l'événement, ici et dans /api/orders.
 */
export default function Commande({
  slug,
  paysCode,
  titre,
  quand,
  lieu,
  tarifs,
  initial,
  compte,
}: {
  slug: string;
  paysCode: string;
  titre: string;
  quand: string;
  lieu: string;
  tarifs: TarifCommande[];
  initial: Record<string, number>;
  compte: Compte;
}) {
  const [q, setQ] = useState<Record<string, number>>(initial);
  const [mode, setMode] = useState<"compte" | "invite" | null>(compte ? "compte" : null);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [tente, setTente] = useState(false);
  const [phase, setPhase] = useState<Phase>("saisie");
  const [erreur, setErreur] = useState<Erreur>(null);

  const lignes = tarifs.filter((t) => (q[t.id] ?? 0) > 0);
  const nb = lignes.reduce((n, t) => n + q[t.id], 0);
  const total = lignes.reduce((n, t) => n + q[t.id] * t.prix, 0);
  const gratuit = nb > 0 && total === 0;
  const plafond = (t: TarifCommande) => Math.min(MAX_PAR_TARIF, t.disponibles);
  const change = (t: TarifCommande, d: number) => setQ((p) => ({ ...p, [t.id]: Math.max(0, Math.min(plafond(t), (p[t.id] ?? 0) + d)) }));

  const invite = mode === "invite";
  const nomOk = !invite || nom.trim().length > 1;
  const emailOk = !invite || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const telOk = !invite || normaliserNumero(paysCode, tel) !== null;
  const coordonneesOk = nomOk && emailOk && telOk;
  const panier = new URLSearchParams(Object.fromEntries(lignes.map((t) => [t.id, String(q[t.id])]))).toString();
  const retour = `/evenement/${slug}/commande${panier ? `?${panier}` : ""}`;
  const envoi = phase !== "saisie";

  async function payer() {
    if (envoi) return; // jamais deux envois simultanés
    setTente(true);
    setErreur(null);
    if (nb === 0 || !mode || !coordonneesOk) return;
    setPhase("envoi");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          items: lignes.map((t) => ({ id: t.id, qte: q[t.id] })),
          ...(invite ? { invite: { nom: nom.trim(), email: email.trim(), telephone: tel.trim() } } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Session expirée entre l'affichage et le paiement.
        setMode(null);
        setErreur({ texte: "Ta session a expiré. Reconnecte-toi, ou continue sans compte." });
        setPhase("saisie");
        return;
      }
      if (res.ok && data.gratuit) {
        window.location.href = `/confirmation?order=${data.orderId}`;
        return;
      }
      if (res.ok && data.url) {
        setPhase("redirection");
        window.location.href = data.url; // → paiement FedaPay
        return;
      }
      if (data.dejaPayee) {
        setErreur({ texte: "Tu as déjà payé cette sélection il y a quelques minutes : rien n'a été payé en plus.", lien: compte ? { href: "/compte", libelle: "Voir mes billets" } : { href: "/billet", libelle: "Retrouver mes billets" } });
        setPhase("saisie");
        return;
      }
      if (data.orderId) {
        // Commande créée mais paiement indisponible : page d'échec, réessai sur la même commande.
        window.location.href = `/paiement/echec?order=${data.orderId}&raison=indisponible`;
        return;
      }
      const message = String(data.error ?? "Une erreur est survenue.");
      setErreur({ texte: `${message}${/[.!?]$/.test(message) ? "" : "."} Rien n'a été payé.` });
      setPhase("saisie");
    } catch {
      setErreur({ texte: "Connexion impossible. Vérifie ta connexion et réessaie : rien n'a été payé." });
      setPhase("saisie");
    }
  }

  const libelle = phase === "envoi" ? "Un instant…" : gratuit ? "Réserver gratuitement" : nb === 0 ? "Choisis tes billets" : `Payer ${fcfa(total)}`;
  const champ = (ok: boolean) => `${s.champ} ${tente && !ok ? s.champErreur : ""}`;

  if (phase === "redirection") {
    return (
      <div className={s.vide} role="status" style={{ maxWidth: 520 }}>
        <Icon name="phone" size={48} className={s.montantOr} />
        <p className={s.videTitre}>Direction FedaPay…</p>
        <p className={s.videTexte}>Tu vas valider {fcfa(total)} sur FedaPay, notre partenaire de paiement. Garde ton téléphone à portée.</p>
      </div>
    );
  }

  return (
    <div className={s.form}>
      <div className={s.formCorps}>
        {erreur && (
          <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 8 }}>
            <Icon name="alert" />
            <span>
              {erreur.texte}
              {erreur.lien && (
                <>
                  {" "}
                  <a href={erreur.lien.href} style={{ textDecoration: "underline" }}>
                    {erreur.lien.libelle}
                  </a>
                </>
              )}
            </span>
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
          {tarifs.length === 0 && <p className={s.note}>Aucun billet en vente pour le moment.</p>}
          <ul className={s.pile} style={{ gap: 8 }}>
            {tarifs.map((t) => {
              const n = q[t.id] ?? 0;
              const epuise = t.disponibles === 0;
              return (
                <li key={t.id} className={s.verrou} style={{ justifyContent: "space-between", color: "inherit", boxShadow: n > 0 ? "inset 0 0 0 1.5px var(--or)" : undefined }}>
                  <span>
                    <b>{t.nom}</b>
                    <span className={s.chiffre} style={{ display: "block", fontWeight: 700 }}>
                      {fcfa(t.prix)}
                      {!epuise && t.disponibles <= 10 && <span className={s.note}> · plus que {t.disponibles}</span>}
                    </span>
                  </span>
                  {epuise ? (
                    <span className={`${s.statut} ${s.stBarre}`}>Épuisé</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" className={`${s.btn} ${s.btnGris}`} style={{ width: 44, padding: 0 }} aria-label={`Retirer un billet ${t.nom}`} disabled={n === 0 || envoi} onClick={() => change(t, -1)}>
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
                        disabled={n >= plafond(t) || envoi}
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
                <a href={`/connexion?redirect=${encodeURIComponent(retour)}`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                  J&apos;ai un compte, me connecter
                </a>
              </div>
              <p className={s.note}>Ton panier est gardé si tu te connectes.</p>
              {tente && <span className={s.erreur}>Choisis comment continuer.</span>}
            </>
          ) : mode === "compte" && compte ? (
            <>
              <p className={s.note} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="check" size={16} /> Connecté : tes billets seront aussi dans ton compte.
              </p>
              <div className={s.champ}>
                <label htmlFor="nom">Nom</label>
                <input id="nom" value={compte.nom} readOnly />
              </div>
              <div className={s.champ}>
                <label htmlFor="email">E-mail</label>
                <input id="email" type="email" value={compte.email} readOnly />
                <span className={s.aide}>Tes billets arrivent à cette adresse.</span>
              </div>
            </>
          ) : (
            <>
              <div className={champ(nomOk)}>
                <label htmlFor="nom">Nom sur les billets</label>
                <input id="nom" autoComplete="name" value={nom} placeholder="Prénom Nom" aria-invalid={tente && !nomOk} disabled={envoi} onChange={(e) => setNom(e.target.value)} />
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
                  aria-invalid={tente && !emailOk}
                  disabled={envoi}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {tente && !emailOk ? <span className={s.erreur}>Indique une adresse e-mail valide.</span> : <span className={s.aide}>Tes billets arrivent à cette adresse.</span>}
              </div>
              <div className={champ(telOk)}>
                <label htmlFor="tel">
                  Numéro Mobile Money <small>(celui qui paie)</small>
                </label>
                <input id="tel" type="tel" inputMode="tel" autoComplete="tel" value={tel} placeholder={exemplePays(paysCode)} aria-invalid={tente && !telOk} disabled={envoi} onChange={(e) => setTel(e.target.value)} />
                {tente && !telOk ? <span className={s.erreur}>{aidePays(paysCode)}</span> : <span className={s.aide}>Il sert aussi en cas de remboursement.</span>}
              </div>
              <button
                type="button"
                className={s.note}
                style={{ background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer", justifySelf: "start" }}
                disabled={envoi}
                onClick={() => setMode(null)}
              >
                Finalement, me connecter
              </button>
            </>
          )}
        </section>
      </div>

      <aside className={s.cote}>
        <Recap titre={titre} quand={quand} lieu={lieu} lignes={lignes} q={q} total={total} />
        <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={envoi} onClick={payer}>
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
        <button type="button" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ flex: 1 }} aria-disabled={envoi} onClick={payer}>
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
        <Icon name="check" size={16} /> Prix affiché = prix payé, aucun frais de service
      </li>
      <li>
        <Icon name="shield" size={16} /> Paiement sécurisé par FedaPay
      </li>
      <li>
        <Icon name="qr" size={16} /> Billet QR par e-mail, dès le paiement validé
      </li>
    </ul>
  );
}
