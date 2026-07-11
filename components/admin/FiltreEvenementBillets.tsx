"use client";

import { useRouter } from "next/navigation";

export default function FiltreEvenementBillets({
  valeur,
  evenements,
}: {
  valeur: string;
  evenements: { id: string; titre: string }[];
}) {
  const router = useRouter();

  return (
    <div className="champ-bloc" style={{ maxWidth: 320, marginBottom: 20 }}>
      <label htmlFor="event">Filtrer par événement</label>
      <select
        id="event"
        defaultValue={valeur}
        onChange={(e) => {
          const params = new URLSearchParams();
          if (e.target.value) params.set("event", e.target.value);
          router.push(`/admin/billets${params.toString() ? `?${params}` : ""}`);
        }}
      >
        <option value="">Tous les événements</option>
        {evenements.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.titre}
          </option>
        ))}
      </select>
    </div>
  );
}
