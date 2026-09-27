"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";

/**
 * Nouveau mot de passe (preview V2). Comme components/ReinitialiserMotDePasseForm.tsx :
 * 8 caractères minimum, confirmation identique. Différences : correspondance
 * vérifiée pendant la saisie, erreurs en français, et après succès on propose
 * « Mon compte » (l'utilisateur est déjà connecté ; la prod le renvoie vers
 * /connexion, qui le redirige aussitôt vers l'accueil).
 */
export default function Reinit({ etatInitial }: { etatInitial: "formulaire" | "termine" }) {
  const [mdp, setMdp] = useState("");
  const [conf, setConf] = useState("");
  const [voir, setVoir] = useState(false);
  const [tente, setTente] = useState(false);
  const [etat, setEtat] = useState<"formulaire" | "envoi" | "termine">(etatInitial);

  const longOk = mdp.length >= 8;
  const pareil = conf.length > 0 && conf === mdp;
  const differents = conf.length > 0 && !mdp.startsWith(conf) && conf !== mdp;

  if (etat === "termine") {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
          <Icon name="check" />
          <span>Mot de passe modifié. Tu es connecté.</span>
        </p>
        <a href={`${B}/compte`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
          Aller à mon compte
        </a>
        <a href={B} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
          Voir les événements
        </a>
      </div>
    );
  }

  return (
    <form
      className={s.form}
      style={{ gap: 16 }}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTente(true);
        if (!longOk || !pareil) return;
        setEtat("envoi");
        setTimeout(() => setEtat("termine"), 700);
      }}
    >
      <div className={`${s.champ} ${tente && !longOk ? s.champErreur : ""}`}>
        <label htmlFor="mdp">Nouveau mot de passe</label>
        <div style={{ position: "relative" }}>
          <input
            id="mdp"
            type={voir ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={mdp}
            style={{ paddingRight: 56 }}
            aria-invalid={tente && !longOk}
            aria-describedby="mdp-aide"
            onChange={(e) => setMdp(e.target.value)}
          />
          <button
            type="button"
            className={s.iconeBtn}
            style={{ position: "absolute", right: 4, top: 4 }}
            aria-label={voir ? "Masquer les mots de passe" : "Afficher les mots de passe"}
            aria-pressed={voir}
            onClick={() => setVoir((x) => !x)}
          >
            <Icon name="eye" size={20} />
          </button>
        </div>
        <span id="mdp-aide" className={tente && !longOk ? s.erreur : s.aide}>
          {mdp.length > 0 && !longOk ? `Encore ${8 - mdp.length} caractère${8 - mdp.length > 1 ? "s" : ""}.` : "8 caractères minimum."}
        </span>
      </div>

      <div className={`${s.champ} ${(tente && !pareil) || differents ? s.champErreur : ""}`}>
        <label htmlFor="conf">Confirme le mot de passe</label>
        <input
          id="conf"
          type={voir ? "text" : "password"}
          autoComplete="new-password"
          value={conf}
          aria-invalid={(tente && !pareil) || differents}
          aria-describedby="conf-aide"
          onChange={(e) => setConf(e.target.value)}
        />
        <span id="conf-aide" className={differents || (tente && !pareil) ? s.erreur : s.aide} aria-live="polite">
          {pareil ? "Les deux mots de passe correspondent." : differents || (tente && conf.length > 0) ? "Les deux mots de passe ne correspondent pas." : tente ? "Confirme ton mot de passe." : " "}
        </span>
      </div>

      <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={etat === "envoi"}>
        {etat === "envoi" ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
