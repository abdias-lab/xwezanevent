"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase-browser";
import ChampMotDePasse from "@/components/ChampMotDePasse";

export default function ReinitialiserMotDePasseForm({
  lienValide,
}: {
  lienValide: boolean;
}) {
  const router = useRouter();
  const [supabase] = useState(() => creerClientNavigateur());

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [termine, setTermine] = useState(false);

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
    setTermine(true);
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

      {!lienValide && !termine && (
        <>
          <p className="alerte-erreur">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <p className="bascule">
            <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </>
      )}

      {lienValide && !termine && (
        <form onSubmit={valider}>
          {erreur && <p className="alerte-erreur">{erreur}</p>}
          <div className="champ-bloc">
            <label htmlFor="mdp">Nouveau mot de passe</label>
            <ChampMotDePasse
              id="mdp"
              placeholder="8 caractères minimum"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="champ-bloc">
            <label htmlFor="mdp-confirm">Confirme le mot de passe</label>
            <ChampMotDePasse
              id="mdp-confirm"
              placeholder="8 caractères minimum"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <button className="btn btn-or btn-large" disabled={enCours}>
            {enCours ? "Mise à jour…" : "Changer mon mot de passe"}
          </button>
        </form>
      )}

      {termine && (
        <p className="alerte-info">
          Mot de passe mis à jour ! Redirection vers la connexion…
        </p>
      )}
    </div>
  );
}
