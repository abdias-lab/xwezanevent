"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";

/**
 * Retrouver mon billet (preview V2). Comme components/RetrouverBilletForm.tsx
 * → POST /api/billets/retrouver : un seul e-mail récapitulatif, même message
 * qu'il y ait des billets ou non (ne pas révéler qui a acheté), une demande par
 * adresse toutes les 15 minutes (en prod, la limite est silencieuse ; ici on
 * dit quand redemander). Aucun appel réseau.
 */
export default function Retrouver({ envoyeInitial }: { envoyeInitial: boolean }) {
  const [email, setEmail] = useState(envoyeInitial ? "aicha.houngbedji@exemple.bj" : "");
  const [tente, setTente] = useState(false);
  const [envoye, setEnvoye] = useState(envoyeInitial);
  const [enCours, setEnCours] = useState(false);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  if (envoye) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
          <Icon name="check" />
          <span>
            Si des billets sont associés à <b>{email.trim()}</b>, ils viennent de t&apos;être envoyés dans un seul e-mail, avec leurs QR codes.
          </span>
        </p>
        <div className={s.panneau}>
          <p className={s.panneauTitre}>Rien reçu ?</p>
          <ul className={s.checklist}>
            <li>
              <Icon name="search" size={16} /> Regarde dans les courriers indésirables.
            </li>
            <li>
              <Icon name="edit" size={16} /> Vérifie l&apos;adresse : c&apos;est celle saisie au moment de l&apos;achat.
            </li>
            <li>
              <Icon name="clock" size={16} /> Tu peux redemander dans 15 minutes.
            </li>
            <li>
              <Icon name="info" size={16} />
              <span>
                Toujours rien ? Écris à{" "}
                <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
                  contact@xwezan.com
                </a>{" "}
                avec le nom de l&apos;événement.
              </span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          className={s.note}
          style={{ background: "none", border: 0, padding: 0, textDecoration: "underline", cursor: "pointer", justifySelf: "start" }}
          onClick={() => {
            setEnvoye(false);
            setTente(false);
          }}
        >
          Essayer une autre adresse
        </button>
      </div>
    );
  }

  return (
    <form
      className={s.formSimple}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTente(true);
        if (!emailOk) return;
        setEnCours(true);
        setTimeout(() => {
          setEnCours(false);
          setEnvoye(true);
        }, 700);
      }}
    >
      <div className={`${s.champ} ${tente && !emailOk ? s.champErreur : ""}`}>
        <label htmlFor="email">E-mail utilisé pour l&apos;achat</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ton@email.com"
          value={email}
          aria-invalid={tente && !emailOk}
          onChange={(e) => setEmail(e.target.value)}
        />
        {tente && !emailOk && <span className={s.erreur}>Indique une adresse e-mail valide.</span>}
      </div>
      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours}>
        <Icon name="ticket" /> {enCours ? "Envoi…" : "Recevoir mes billets par e-mail"}
      </button>
      <p className={s.note}>
        Tu as un compte ?{" "}
        <a href={`${B}/connexion?redirect=/compte`} style={{ textDecoration: "underline" }}>
          Connecte-toi
        </a>{" "}
        : tes billets sont dans « Mes billets ».
      </p>
    </form>
  );
}
