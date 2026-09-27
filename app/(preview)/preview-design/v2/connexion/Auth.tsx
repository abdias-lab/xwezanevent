"use client";

import { useState } from "react";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { B } from "../Coquille";

type Vue = "connexion" | "inscription";

/**
 * Connexion / inscription (preview V2). Mêmes champs et règles que
 * components/AuthForm.tsx : e-mail + mot de passe ; inscription avec nom,
 * téléphone (pour Mobile Money) et mot de passe de 8 caractères minimum.
 * Erreurs toujours en français (en prod, l'inscription affiche le message
 * Supabase brut : BUGS_REFONTE #9). Aucun appel réseau.
 */
export default function Auth({ vueInitiale, erreurInitiale, creeInitial }: { vueInitiale: Vue; erreurInitiale: boolean; creeInitial: boolean }) {
  const [vue, setVue] = useState<Vue>(vueInitiale);
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [voir, setVoir] = useState(false);
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [tente, setTente] = useState(false);
  const [erreur, setErreur] = useState<string | null>(erreurInitiale ? "E-mail ou mot de passe incorrect." : null);
  const [cree, setCree] = useState(creeInitial);
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

  function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setTente(true);
    setErreur(null);
    const valide = vue === "connexion" ? emailOk && mdp.length > 0 : emailOk && mdpOk && nomOk && telOk;
    if (!valide) return;
    setEnCours(true);
    setTimeout(() => {
      setEnCours(false);
      if (vue === "inscription") {
        setCree(true);
        setVue("connexion");
        setMdp("");
        setTente(false);
      } else setErreur("Preview : aucune connexion réelle. Le parcours s'arrête ici.");
    }, 700);
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

      <form className={s.form} style={{ gap: 16 }} noValidate onSubmit={envoyer}>
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
          <a href={`${B}/mot-de-passe-oublie`} className={s.note} style={{ justifySelf: "start", textDecoration: "underline" }}>
            Mot de passe oublié ?
          </a>
        )}

        <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} aria-disabled={enCours}>
          {enCours ? (vue === "connexion" ? "Connexion…" : "Création…") : vue === "connexion" ? "Se connecter" : "Créer mon compte"}
        </button>

        {vue === "inscription" && (
          <p className={s.note}>
            En créant un compte, tu acceptes les{" "}
            <a href="#" style={{ textDecoration: "underline" }}>
              conditions générales
            </a>
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
