"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase-browser";

type Vue = "connexion" | "inscription";

export default function AuthForm({ redirect = "/" }: { redirect?: string }) {
  const router = useRouter();
  const supabase = creerClientNavigateur();

  const [vue, setVue] = useState<Vue>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const changerVue = (v: Vue) => {
    setVue(v);
    setErreur(null);
    setInfo(null);
  };

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    });
    setEnCours(false);
    if (error) {
      setErreur("Email ou mot de passe incorrect.");
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  async function inscription(e: React.FormEvent) {
    e.preventDefault();
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: motDePasse,
      options: { data: { nom, telephone } },
    });
    setEnCours(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    if (data.session) {
      // Session immédiate (confirmation email désactivée)
      router.push(redirect);
      router.refresh();
    } else {
      setInfo(
        "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi."
      );
      setVue("connexion");
    }
  }

  return (
    <div className="boite">
      <Link className="logo" href="/">
        <span className="mark" aria-hidden="true" />
        Xwézan<em>Event</em>
      </Link>

      <h2>{vue === "connexion" ? "Bon retour 👋" : "Bienvenue 🎉"}</h2>
      <p className="sous">
        {vue === "connexion"
          ? "Connecte-toi à ton compte XwézanEvent"
          : "Crée ton compte en 30 secondes"}
      </p>

      <div className="onglets" role="tablist">
        <button
          className="onglet"
          role="tab"
          aria-selected={vue === "connexion"}
          onClick={() => changerVue("connexion")}
          type="button"
        >
          Connexion
        </button>
        <button
          className="onglet"
          role="tab"
          aria-selected={vue === "inscription"}
          onClick={() => changerVue("inscription")}
          type="button"
        >
          Inscription
        </button>
      </div>

      {erreur && <p className="alerte-erreur">{erreur}</p>}
      {info && <p className="alerte-info">{info}</p>}

      {vue === "connexion" ? (
        <form onSubmit={connexion}>
          <div className="champ-bloc">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="mdp">Mot de passe</label>
            <input
              id="mdp"
              type="password"
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          {/* TODO: pas de lien "Mot de passe oublié" — à implémenter (flow de réinitialisation Supabase) */}
          <button className="btn btn-or btn-large" disabled={enCours}>
            {enCours ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      ) : (
        <form onSubmit={inscription}>
          <div className="champ-bloc">
            <label htmlFor="nom-i">Nom complet</label>
            <input
              id="nom-i"
              type="text"
              placeholder="Prénom Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="email-i">Email</label>
            <input
              id="email-i"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="tel-i">
              Téléphone <small>(pour Mobile Money)</small>
            </label>
            <input
              id="tel-i"
              type="tel"
              placeholder="+229 01 XX XX XX XX"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="mdp-i">Mot de passe</label>
            <input
              id="mdp-i"
              type="password"
              placeholder="8 caractères minimum"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-or btn-large" disabled={enCours}>
            {enCours ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      )}

      <p className="bascule">
        {vue === "connexion" ? (
          <>
            Pas encore de compte ?{" "}
            <button
              type="button"
              className="lien-bascule"
              onClick={() => changerVue("inscription")}
            >
              S&apos;inscrire gratuitement
            </button>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <button
              type="button"
              className="lien-bascule"
              onClick={() => changerVue("connexion")}
            >
              Se connecter
            </button>
          </>
        )}
      </p>
    </div>
  );
}
