"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase-browser";

type Etat = "verification" | "pret" | "invalide" | "termine";

export default function ReinitialiserMotDePasseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = creerClientNavigateur();

  const [etat, setEtat] = useState<Etat>("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setEtat("invalide");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      setEtat(error ? "invalide" : "pret");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
