"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";

const MAX_MESSAGE = 5000; // limite de /api/contact

/**
 * Formulaire de contact (preview V2). Mêmes champs et limites que
 * components/FormulaireContact.tsx → POST /api/contact (nom et e-mail ≤ 200,
 * message ≤ 5000, champ piège « site_web » invisible). Aucun envoi réel.
 */
export default function Formulaire({ envoyeInitial, erreurInitiale }: { envoyeInitial: boolean; erreurInitiale: boolean }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [piege, setPiege] = useState("");
  const [tente, setTente] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(envoyeInitial);

  const nomOk = nom.trim().length > 0 && nom.length <= 200;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 200;
  const messageOk = message.trim().length > 0 && message.length <= MAX_MESSAGE;

  if (envoye) {
    return (
      <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
        <Icon name="check" />
        <span>Message envoyé ! On te répond dès que possible, directement à ton adresse email.</span>
      </p>
    );
  }

  const champ = (ok: boolean) => `${s.champ} ${tente && !ok ? s.champErreur : ""}`;

  return (
    <form
      className={s.formSimple}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTente(true);
        if (!nomOk || !emailOk || !messageOk) {
          requestAnimationFrame(() => document.querySelector<HTMLElement>(`form [aria-invalid="true"]`)?.focus());
          return;
        }
        if (piege) return;
        setEnCours(true);
        setTimeout(() => {
          setEnCours(false);
          setEnvoye(true);
        }, 700);
      }}
    >
      {erreurInitiale && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
          <Icon name="alert" />
          <span>Une erreur est survenue. Ton message n&apos;est pas parti : réessaie, ou écris directement à contact@xwezan.com.</span>
        </p>
      )}
      <div className={champ(nomOk)}>
        <label htmlFor="nom">Ton nom</label>
        <input id="nom" autoComplete="name" maxLength={200} placeholder="Prénom Nom" value={nom} aria-invalid={tente && !nomOk} onChange={(e) => setNom(e.target.value)} />
        {tente && !nomOk && <span className={s.erreur}>Indique ton nom.</span>}
      </div>
      <div className={champ(emailOk)}>
        <label htmlFor="email">Ton email</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={200}
          placeholder="ton@email.com"
          value={email}
          aria-invalid={tente && !emailOk}
          onChange={(e) => setEmail(e.target.value)}
        />
        {tente && !emailOk ? <span className={s.erreur}>Indique une adresse e-mail valide.</span> : <span className={s.aide}>On te répond à cette adresse.</span>}
      </div>
      <div className={champ(messageOk)}>
        <label htmlFor="message">Ton message</label>
        <textarea id="message" rows={6} maxLength={MAX_MESSAGE} placeholder="Dis-nous tout…" value={message} aria-invalid={tente && !messageOk} onChange={(e) => setMessage(e.target.value)} />
        <span className={tente && !messageOk ? s.erreur : s.aide}>
          {tente && !message.trim() ? "Écris ton message." : `${message.length} / ${MAX_MESSAGE} caractères`}
        </span>
      </div>

      {/* Champ piège anti-spam, invisible et hors tabulation (comme en prod). */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="site_web">Site web</label>
        <input id="site_web" type="text" tabIndex={-1} autoComplete="off" value={piege} onChange={(e) => setPiege(e.target.value)} />
      </div>

      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours}>
        <Icon name="arrow" /> {enCours ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
