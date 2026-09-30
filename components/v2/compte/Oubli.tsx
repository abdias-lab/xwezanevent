"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import s from "../espace.module.css";
import Icon from "../Icon";

const ATTENTE_S = 60; // limite d'envoi d'e-mails de Supabase (par défaut)

/**
 * Mot de passe oublié (V2), repris de la preview (v2/mot-de-passe-oublie/Oubli.tsx)
 * et branché sur Supabase comme l'ancien MotDePasseOublieForm : même message
 * que le compte existe ou non (ne pas révéler les comptes). Renvoi du lien
 * possible après 60 s.
 */
export default function Oubli() {
  const supabase = useMemo(() => creerClientNavigateur(), []);
  const [email, setEmail] = useState("");
  const [tente, setTente] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [reste, setReste] = useState(0);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (reste <= 0) return;
    const t = setTimeout(() => setReste((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [reste]);

  async function envoyer(e?: React.FormEvent) {
    e?.preventDefault();
    if (enCours) return;
    setTente(true);
    if (!emailOk) return;
    setEnCours(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    // Même écran que ça réussisse ou non, pour ne pas révéler si un compte
    // existe avec cet e-mail.
    if (error) console.error("[auth] resetPasswordForEmail:", error.message);
    setEnCours(false);
    setEnvoye(true);
    setReste(ATTENTE_S);
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
      <Link href="/connexion" className={s.note} style={{ textDecoration: "underline", justifySelf: "start" }}>
        Retour à la connexion
      </Link>
    </form>
  );
}
