"use client";

import { useRouter } from "next/navigation";

const STATUTS_FILTRE = [
  { valeur: "", label: "Tous les statuts" },
  { valeur: "publie", label: "Publié" },
  { valeur: "en_validation", label: "En validation" },
  { valeur: "brouillon", label: "Brouillon" },
  { valeur: "termine", label: "Terminé" },
  { valeur: "refuse", label: "Refusé" },
  { valeur: "annule", label: "Annulé" },
];

export default function FiltreStatutEvenements({ valeur }: { valeur: string }) {
  const router = useRouter();

  return (
    <div className="champ-bloc" style={{ maxWidth: 260, marginBottom: 20 }}>
      <label htmlFor="statut">Filtrer par statut</label>
      <select
        id="statut"
        defaultValue={valeur}
        onChange={(e) => {
          const params = new URLSearchParams();
          if (e.target.value) params.set("statut", e.target.value);
          router.push(`/admin/evenements${params.toString() ? `?${params}` : ""}`);
        }}
      >
        {STATUTS_FILTRE.map((s) => (
          <option key={s.valeur} value={s.valeur}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}
