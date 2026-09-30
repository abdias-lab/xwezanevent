"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import { normaliserNumero } from "@/lib/telephone";
import s from "../espace.module.css";
import Icon from "../Icon";

type Vue = "connexion" | "inscription";

/**
 * Erreurs Supabase en français (design/BUGS_REFONTE.md n°9 : l'inscription
 * affichait le message brut, en anglais). Codes de supabase-js ; message
 * générique pour tout le reste.
 */
function messageInscription(e: AuthError): string {
  switch (e.code) {
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse. Connecte-toi, ou utilise « Mot de passe oublié ».";
    case "weak_password":
      return "Mot de passe trop faible. Choisis-en un plus long, avec des lettres et des chiffres.";
    case "email_address_invalid":
      return "Cette adresse e-mail n'est pas acceptée. Vérifie-la ou utilise-en une autre.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de tentatives. Réessaie dans quelques minutes.";
    default:
      return "La création du compte a échoué. Réessaie dans un instant.";
  }
}

/**
 * Connexion / inscription (V2), reprise de la preview (v2/connexion/Auth.tsx)
 * et branchée sur Supabase Auth comme l'ancien components/AuthForm.tsx :
 * e-mail + mot de passe ; inscription avec nom, téléphone (Mobile Money,
 * facultatif) et mot de passe de 8 caractères minimum.
 */
export default function Auth({ vueInitiale, redirect }: { vueInitiale: Vue; redirect: string }) {
  const router = useRouter();
  const supabase = useMemo(() => creerClientNavigateur(), []);
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [voir, setVoir] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [tente, setTente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cree, setCree] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const mdpOk = mdp.length >= 8;
  const nomOk = nom.trim().length > 1;
  const chiffresTel = tel.replace(/\D/g, "");
  const telOk = chiffresTel.length === 0 || chiffresTel.length === 8 || chiffresTel.length === 10 || (chiffresTel.length === 13 && chiffresTel.startsWith("229"));

  function changer(v: Vue) {
    setVue(v);
    setTente(false);
    setErreur(null);
    setCree(false);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (enCours) return;
    setTente(true);
    setErreur(null);
    const valide = vue === "connexion" ? emailOk && mdp.length > 0 : emailOk && mdpOk && nomOk && telOk;
    if (!valide) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`form [aria-invalid="true"]`)?.focus());
      return;
    }
    setEnCours(true);
    if (vue === "connexion") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
      if (error) {
        setEnCours(false);
        setErreur(error.code === "over_request_rate_limit" ? "Trop de tentatives. Réessaie dans quelques minutes." : "E-mail ou mot de passe incorrect.");
        return;
      }
      router.push(redirect);
      router.refresh();
      return;
    }
    // Téléphone enregistré au format normalisé quand il est reconnu (sinon tel quel,
    // la base le borne : 20260717150000_capture_telephone_inscription.sql).
    const telephone = chiffresTel ? (normaliserNumero("bj", tel) ?? tel.trim()) : "";
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: mdp,
      options: { data: { nom: nom.trim(), telephone } },
    });
    setEnCours(false);
    if (error) {
      setErreur(messageInscription(error));
      return;
    }
    if (data.session) {
      // Session immédiate (confirmation e-mail désactivée).
      router.push(redirect);
      router.refresh();
      return;
    }
    setCree(true);
    setVue("connexion");
    setMdp("");
    setTente(false);
  }

  const champ = (ok: boolean) => `${s.champ} ${tente && !ok ? s.champErreur : ""}`;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className={s.modes} role="tablist" aria-label="Connexion ou inscription" style={{ marginBottom: 0 }}>
        <button type="button" role="tab" aria-selected={vue === "connexion"} className={`${s.mode} ${vue === "connexion" ? s.modeOn : ""}`} onClick={() => changer("connexion")}>
          Se connecter
        </button>
        <button type="button" role="tab" aria-selected={vue === "inscription"} className={`${s.mode} ${vue === "inscription" ? s.modeOn : ""}`} onClick={() => changer("inscription")}>
          Créer un compte
        </button>
      </div>

      {cree && (
        <p className={s.alerte} role="status" style={{ marginBottom: 0 }}>
          <Icon name="check" />
          <span>Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.</span>
        </p>
      )}
      {erreur && (
        <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
          <Icon name="alert" />
          <span>{erreur}</span>
        </p>
      )}

      <form className={s.formSimple} noValidate onSubmit={envoyer}>
        {vue === "inscription" && (
          <div className={champ(nomOk)}>
            <label htmlFor="nom">Nom complet</label>
            <input id="nom" type="text" autoComplete="name" placeholder="Prénom Nom" value={nom} aria-invalid={tente && !nomOk} onChange={(e) => setNom(e.target.value)} />
            {tente && !nomOk ? <span className={s.erreur}>Indique ton prénom et ton nom.</span> : <span className={s.aide}>Jamais affiché publiquement.</span>}
          </div>
        )}

        <div className={champ(emailOk)}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete={vue === "connexion" ? "username" : "email"}
            placeholder="ton@email.com"
            value={email}
            aria-invalid={tente && !emailOk}
            onChange={(e) => setEmail(e.target.value)}
          />
          {tente && !emailOk && <span className={s.erreur}>Indique une adresse e-mail valide.</span>}
        </div>

        {vue === "inscription" && (
          <div className={champ(telOk)}>
            <label htmlFor="tel">
              Téléphone <small>(facultatif, pour Mobile Money)</small>
            </label>
            <input id="tel" type="tel" inputMode="tel" autoComplete="tel" placeholder="01 97 00 00 00" value={tel} aria-invalid={tente && !telOk} onChange={(e) => setTel(e.target.value)} />
            {tente && !telOk && <span className={s.erreur}>Numéro béninois : 10 chiffres commençant par 01, ou 8 chiffres.</span>}
          </div>
        )}

        <div className={champ(vue === "connexion" ? mdp.length > 0 : mdpOk)}>
          <label htmlFor="mdp">Mot de passe</label>
          <div style={{ position: "relative" }}>
            <input
              id="mdp"
              type={voir ? "text" : "password"}
              autoComplete={vue === "connexion" ? "current-password" : "new-password"}
              placeholder={vue === "inscription" ? "8 caractères minimum" : ""}
              value={mdp}
              style={{ paddingRight: 56 }}
              aria-invalid={tente && !(vue === "connexion" ? mdp.length > 0 : mdpOk)}
              onChange={(e) => setMdp(e.target.value)}
            />
            <button
              type="button"
              className={s.iconeBtn}
              style={{ position: "absolute", right: 4, top: 4 }}
              aria-label={voir ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              aria-pressed={voir}
              onClick={() => setVoir((x) => !x)}
            >
              <Icon name="eye" size={20} />
            </button>
          </div>
          {vue === "inscription" ? (
            <span className={tente && !mdpOk ? s.erreur : s.aide}>
              {mdp.length > 0 && !mdpOk ? `Encore ${8 - mdp.length} caractère${8 - mdp.length > 1 ? "s" : ""}.` : "8 caractères minimum."}
            </span>
          ) : tente && mdp.length === 0 ? (
            <span className={s.erreur}>Indique ton mot de passe.</span>
          ) : null}
        </div>

        {vue === "connexion" && (
          <Link href="/mot-de-passe-oublie" className={s.note} style={{ justifySelf: "start", textDecoration: "underline" }}>
            Mot de passe oublié ?
          </Link>
        )}

        <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours}>
          {enCours ? (vue === "connexion" ? "Connexion…" : "Création…") : vue === "connexion" ? "Se connecter" : "Créer mon compte"}
        </button>

        {vue === "inscription" && (
          <p className={s.note}>
            En créant un compte, tu acceptes les{" "}
            <Link href="/cgu" style={{ textDecoration: "underline" }}>
              conditions générales
            </Link>
            .
          </p>
        )}
      </form>

      <p className={s.note} style={{ textAlign: "center" }}>
        Pas besoin de compte pour acheter un billet : tu peux payer en invité, ton billet arrive par e-mail.
      </p>
    </div>
  );
}
