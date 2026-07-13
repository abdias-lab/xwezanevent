"use client";

import { useState } from "react";

export default function RetrouverBilletForm() {
  const [email, setEmail] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    try {
      await fetch("/api/billets/retrouver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Rien à faire : le message affiché reste le même quoi qu'il arrive.
    }
    setEnCours(false);
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <p className="alerte-info">
        Si des billets sont associés à cette adresse, un email vient d&apos;être
        envoyé. Vérifie ta boîte mail (et les spams).
      </p>
    );
  }

  return (
    <form onSubmit={envoyer}>
      <div className="champ-bloc">
        <label htmlFor="email-retrouver">Ton email</label>
        <input
          id="email-retrouver"
          type="email"
          placeholder="ton@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button className="btn btn-ghost btn-large" disabled={enCours}>
        {enCours ? "Envoi…" : "Recevoir mes billets par email"}
      </button>
    </form>
  );
}
