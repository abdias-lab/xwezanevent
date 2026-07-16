"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ToggleMiseEnAvant({
  eventId,
  misEnAvant,
  ordreAffiche,
  eligible,
}: {
  eventId: string;
  misEnAvant: boolean;
  ordreAffiche: number | null;
  eligible: boolean;
}) {
  const router = useRouter();
  const [coche, setCoche] = useState(misEnAvant);
  const [ordre, setOrdre] = useState(ordreAffiche != null ? String(ordreAffiche) : "");
  const [enCours, setEnCours] = useState(false);

  async function envoyer(misEnAvantSuivant: boolean, ordreSuivant: string) {
    setEnCours(true);
    const ordreNombre = ordreSuivant.trim() ? parseInt(ordreSuivant, 10) : null;
    try {
      const res = await fetch(`/api/admin/events/${eventId}/mettre-en-avant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          misEnAvant: misEnAvantSuivant,
          ordreAffiche: Number.isInteger(ordreNombre) ? ordreNombre : null,
        }),
      });
      if (res.ok) router.refresh();
    } finally {
      setEnCours(false);
    }
  }

  if (!eligible) {
    return <span>—</span>;
  }

  return (
    <div className="mise-en-avant">
      <label className="case">
        <input
          type="checkbox"
          checked={coche}
          disabled={enCours}
          onChange={(e) => {
            const v = e.target.checked;
            setCoche(v);
            envoyer(v, ordre);
          }}
        />
        En avant
      </label>
      {coche && (
        <input
          type="number"
          className="ordre"
          placeholder="Ordre"
          min={1}
          value={ordre}
          disabled={enCours}
          onChange={(e) => setOrdre(e.target.value)}
          onBlur={() => envoyer(true, ordre)}
        />
      )}
    </div>
  );
}
