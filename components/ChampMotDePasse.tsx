"use client";

import { useState } from "react";

interface ChampMotDePasseProps {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

/**
 * Champ mot de passe avec bouton œil pour basculer sa visibilité
 * (password <-> text). Masqué par défaut ; le bouton est type="button"
 * pour ne jamais déclencher la soumission du formulaire parent.
 */
export default function ChampMotDePasse({
  id,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: ChampMotDePasseProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="champ-mdp">
      <input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="toggle-mdp"
        aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? "🙈" : "👁"}
      </button>
    </div>
  );
}
