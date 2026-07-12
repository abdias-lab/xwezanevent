"use client";

import { useRouter, useSearchParams } from "next/navigation";

const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "N'importe quand" },
  { value: "aujourdhui", label: "Aujourd'hui" },
  { value: "week-end", label: "Ce week-end" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois-ci" },
];

export default function FiltreQuand({ quandActif }: { quandActif?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function choisir(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("quand", value);
    } else {
      params.delete("quand");
    }
    router.push(`/evenements${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <div className="bloc-filtre">
      <h3>Date</h3>
      {OPTIONS.map((opt) => (
        <label key={opt.value || "any"} className="case">
          <input
            type="radio"
            name="quand"
            checked={(quandActif ?? "") === opt.value}
            onChange={() => choisir(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
