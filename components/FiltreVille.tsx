"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Liste des villes fournie par le parent (app/(public)/evenements/page.tsx),
 * dérivée de lib/events.ts::getVillesPubliees(pays) — plus de liste codée
 * en dur : ça restait spécifiquement béninois (Cotonou, Porto-Novo…) et
 * aurait montré ces villes même en contexte Togo (voir le chantier
 * multi-pays, supabase/migrations/20260805120000_multi_pays_evenements.sql).
 */
export default function FiltreVille({
  villeActive,
  villesDisponibles,
}: {
  villeActive?: string;
  villesDisponibles: string[];
}) {
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
  const options = villeActive && !villesDisponibles.includes(villeActive)
    ? [...villesDisponibles, villeActive]
    : villesDisponibles;

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
