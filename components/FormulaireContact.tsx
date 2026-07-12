"use client";

import { useState } from "react";

export default function FormulaireContact() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [siteWeb, setSiteWeb] = useState(""); // honeypot — doit rester vide

  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, email, message, site_web: siteWeb }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErreur(data?.error ?? "Une erreur est survenue.");
        setEnCours(false);
        return;
      }
      setEnvoye(true);
    } catch {
      setErreur("Connexion impossible. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  if (envoye) {
    return (
      <p className="alerte-info">
        Message envoyé ! On te répond dès que possible, directement à ton
        adresse email.
      </p>
    );
  }

  return (
    <form onSubmit={envoyer}>
      {erreur && <p className="alerte-erreur">{erreur}</p>}

      <div className="champ-bloc">
        <label htmlFor="nom">Ton nom</label>
        <input
          id="nom"
          type="text"
          placeholder="Prénom Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
        />
      </div>

      <div className="champ-bloc">
        <label htmlFor="email">Ton email</label>
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
        <label htmlFor="message">Ton message</label>
        <textarea
          id="message"
          rows={5}
          placeholder="Dis-nous tout…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
      </div>

      {/* Honeypot anti-spam : invisible et hors tabulation pour un humain. */}
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="site_web">Site web</label>
        <input
          id="site_web"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={siteWeb}
          onChange={(e) => setSiteWeb(e.target.value)}
        />
      </div>

      <button className="btn btn-or btn-large" disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer le message"}
      </button>
    </form>
  );
}
