"use client";

import { useState } from "react";
import Link from "next/link";
import { creerClientNavigateur } from "@/lib/supabase-browser";

export default function MotDePasseOublieForm() {
  const supabase = creerClientNavigateur();

  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setEnCours(false);
    // On affiche le même message que ça réussisse ou non, pour ne pas
    // révéler si un compte existe avec cet email.
    if (error) console.error("[auth] resetPasswordForEmail:", error.message);
    setEnvoye(true);
  }

  return (
    <div className="boite">
      <Link className="logo" href="/">
        <span className="mark" aria-hidden="true" />
        Xwézan<em>Event</em>
      </Link>

      <h2>Mot de passe oublié ?</h2>
      <p className="sous">
        Indique ton email, on t&apos;envoie un lien pour en choisir un nouveau.
      </p>

      {envoye ? (
        <p className="alerte-info">
          Si un compte existe avec cet email, un lien de réinitialisation
          vient de t&apos;être envoyé. Vérifie ta boîte mail.
        </p>
      ) : (
        <form onSubmit={envoyer}>
          {erreur && <p className="alerte-erreur">{erreur}</p>}
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
          <button className="btn btn-or btn-large" disabled={enCours}>
            {enCours ? "Envoi…" : "Envoyer le lien"}
          </button>
        </form>
      )}

      <p className="bascule">
        <Link href="/connexion">Retour à la connexion</Link>
      </p>
    </div>
  );
}
