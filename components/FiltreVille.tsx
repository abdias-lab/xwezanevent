"use client";

import { useRouter, useSearchParams } from "next/navigation";

const VILLES = ["Cotonou", "Porto-Novo", "Ouidah", "Abomey", "Parakou", "Grand-Popo"];

export default function FiltreVille({ villeActive }: { villeActive?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function choisir(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("ville", value);
    } else {
      params.delete("ville");
    }
    router.push(`/evenements${params.toString() ? `?${params.toString()}` : ""}`);
  }

  // La ville active peut être une saisie libre absente de la liste : on l'affiche quand même.
  const options = villeActive && !VILLES.includes(villeActive)
    ? [...VILLES, villeActive]
    : VILLES;

  return (
    <div className="bloc-filtre">
      <h3>Ville</h3>
      <label className="case">
        <input type="radio" name="ville" checked={!villeActive} onChange={() => choisir("")} />
        Toutes les villes
      </label>
      {options.map((v) => (
        <label key={v} className="case">
          <input type="radio" name="ville" checked={villeActive === v} onChange={() => choisir(v)} />
          {v}
        </label>
      ))}
    </div>
  );
}
