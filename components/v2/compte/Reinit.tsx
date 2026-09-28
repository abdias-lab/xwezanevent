"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import s from "../espace.module.css";
import Icon from "../Icon";

/** Erreurs de updateUser en français (le message Supabase brut était affiché, en anglais). */
function message(e: AuthError): string {
  switch (e.code) {
    case "same_password":
      return "C'est déjà ton mot de passe actuel. Choisis-en un nouveau.";
    case "weak_password":
      return "Mot de passe trop faible. Choisis-en un plus long, avec des lettres et des chiffres.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "Ton lien a expiré. Demande un nouveau lien depuis « Mot de passe oublié ».";
    default:
      return "Le mot de passe n'a pas pu être changé. Réessaie dans un instant.";
  }
}

/**
 * Nouveau mot de passe (V2), repris de la preview (v2/reinitialiser-mot-de-passe/Reinit.tsx)
 * et branché sur Supabase comme l'ancien ReinitialiserMotDePasseForm : la
 * session est déjà ouverte par /auth/confirm, updateUser change le mot de
 * passe. Après succès, l'utilisateur reste connecté : on propose « Mon compte »
 * (design/BUGS_REFONTE.md A3) au lieu de le renvoyer vers /connexion.
 */
export default function Reinit() {
  const router = useRouter();
  const supabase = useMemo(() => creerClientNavigateur(), []);
  const [mdp, setMdp] = useState("");
  const [conf, setConf] = useState("");
  const [voir, setVoir] = useState(false);
  const [tente, setTente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [etat, setEtat] = useState<"formulaire" | "envoi" | "termine">("formulaire");

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
        <Link href="/compte" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
          Aller à mon compte
        </Link>
        <Link href="/" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
          Voir les événements
        </Link>
      </div>
    );
  }

  return (
    <form
      className={s.formSimple}
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (etat === "envoi") return;
        setTente(true);
        setErreur(null);
        if (!longOk || !pareil) {
          requestAnimationFrame(() => document.querySelector<HTMLElement>(`form [aria-invalid="true"]`)?.focus());
          return;
        }
        setEtat("envoi");
        const { error } = await supabase.auth.updateUser({ password: mdp });
        if (error) {
          setErreur(message(error));
          setEtat("formulaire");
          return;
        }
        setEtat("termine");
        // L'en-tête (Server Component) passe à « Mon compte ».
        router.refresh();
      }}
    >
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}
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
