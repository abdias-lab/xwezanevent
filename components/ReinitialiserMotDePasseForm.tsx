"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase-browser";

type Etat = "verification" | "pret" | "invalide" | "termine";

export default function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // detectSessionInUrl désactivé : on traite nous-mêmes le jeton du hash
  // (#access_token=...), à usage unique — sinon, en React Strict Mode (dev),
  // les instances de client créées en double se le disputeraient et la
  // perdante de la course ne trouverait plus rien.
  const [supabase] = useState(() => creerClientNavigateur({ detectSessionInUrl: false }));

  const [etat, setEtat] = useState<Etat>("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    async function verifier() {
      // Le lien Supabase peut signaler une erreur directement dans le hash
      // (ex. lien déjà utilisé ou expiré) : #error=access_denied&error_code=otp_expired
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      if (hash.get("error")) {
        setEtat("invalide");
        return;
      }

      // Flux implicite : le lien contient #access_token=...&refresh_token=...&type=recovery.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // On retire le jeton de l'URL (barre d'adresse, historique) une fois consommé.
        window.history.replaceState(null, "", window.location.pathname);
        setEtat(error ? "invalide" : "pret");
        return;
      }

      // Flux PKCE : le lien contient ?code=... à échanger contre une session.
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        setEtat(error ? "invalide" : "pret");
        return;
      }

      setEtat("invalide");
    }
    verifier();
  }, [supabase, searchParams]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur(error.message);
      return;
    }
    setEtat("termine");
    setTimeout(() => {
      router.push("/connexion");
      router.refresh();
    }, 2000);
  }

  return (
    <div className="boite">
      <Link className="logo" href="/">
        <span className="mark" aria-hidden="true" />
        Xwézan<em>Event</em>
      </Link>

      <h2>Nouveau mot de passe</h2>

      {etat === "verification" && (
        <p className="sous">Vérification du lien…</p>
      )}

      {etat === "invalide" && (
        <>
          <p className="alerte-erreur">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <p className="bascule">
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </>
      )}

      {etat === "pret" && (
        <form onSubmit={valider}>
          {erreur && <p className="alerte-erreur">{erreur}</p>}
          <div className="champ-bloc">
            <label htmlFor="mdp">Nouveau mot de passe</label>
            <input
              id="mdp"
              type="password"
              placeholder="8 caractères minimum"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              required
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="mdp-confirm">Confirme le mot de passe</label>
            <input
              id="mdp-confirm"
              type="password"
              placeholder="8 caractères minimum"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-or btn-large" disabled={enCours}>
            {enCours ? "Mise à jour…" : "Changer mon mot de passe"}
          </button>
        </form>
      )}

      {etat === "termine" && (
        <p className="alerte-info">
          Mot de passe mis à jour ! Redirection vers la connexion…
        </p>
      )}
    </div>
  );
}
