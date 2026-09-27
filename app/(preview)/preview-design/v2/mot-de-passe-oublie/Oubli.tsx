"use client";

import { useEffect, useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";

const ATTENTE_S = 60; // limite d'envoi d'e-mails de Supabase (par défaut)

/**
 * Mot de passe oublié (preview V2). Comme components/MotDePasseOublieForm.tsx :
 * même message que le compte existe ou non (ne pas révéler les comptes).
 * Ajout : renvoi du lien après 60 s. Aucun appel réseau.
 */
export default function Oubli({ envoyeInitial }: { envoyeInitial: boolean }) {
  const [email, setEmail] = useState(envoyeInitial ? "ton@email.com" : "");
  const [tente, setTente] = useState(false);
  const [envoye, setEnvoye] = useState(envoyeInitial);
  const [enCours, setEnCours] = useState(false);
  const [reste, setReste] = useState(envoyeInitial ? ATTENTE_S : 0);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (reste <= 0) return;
    const t = setTimeout(() => setReste((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [reste]);

  function envoyer(e?: React.FormEvent) {
    e?.preventDefault();
    setTente(true);
    if (!emailOk) return;
    setEnCours(true);
    setTimeout(() => {
      setEnCours(false);
      setEnvoye(true);
      setReste(ATTENTE_S);
    }, 600);
  }

  if (envoye) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
          <Icon name="check" />
          <span>
            Si un compte existe avec <b>{email.trim()}</b>, un lien pour choisir un nouveau mot de passe vient d&apos;être envoyé. Pense à regarder dans les
            courriers indésirables.
          </span>
        </p>
        <button type="button" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} disabled={reste > 0 || enCours} onClick={() => envoyer()}>
          {enCours ? "Envoi…" : reste > 0 ? `Renvoyer le lien dans ${reste} s` : "Renvoyer le lien"}
        </button>
        <button
          type="button"
          className={s.note}
          style={{ background: "none", border: 0, textDecoration: "underline", cursor: "pointer", justifySelf: "start", padding: 0 }}
          onClick={() => {
            setEnvoye(false);
            setTente(false);
          }}
        >
          Ce n&apos;est pas la bonne adresse ?
        </button>
      </div>
    );
  }

  return (
    <form className={s.formSimple} noValidate onSubmit={envoyer}>
      <div className={`${s.champ} ${tente && !emailOk ? s.champErreur : ""}`}>
        <label htmlFor="email">E-mail du compte</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          placeholder="ton@email.com"
          value={email}
          aria-invalid={tente && !emailOk}
          onChange={(e) => setEmail(e.target.value)}
        />
        {tente && !emailOk && <span className={s.erreur}>Indique une adresse e-mail valide.</span>}
      </div>
      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer le lien"}
      </button>
      <a href={`${B}/connexion`} className={s.note} style={{ textDecoration: "underline", justifySelf: "start" }}>
        Retour à la connexion
      </a>
    </form>
  );
}
