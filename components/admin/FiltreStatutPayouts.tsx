"use client";

import { useRouter } from "next/navigation";

const STATUTS_FILTRE = [
  { valeur: "", label: "Tous les statuts" },
  { valeur: "demande", label: "En attente" },
  { valeur: "traite", label: "Traité" },
  { valeur: "bloque", label: "Gelé" },
];

export default function FiltreStatutPayouts({
  statut,
  tri,
}: {
  statut: string;
  tri: string;
}) {
  const router = useRouter();

  function naviguer(params: URLSearchParams) {
    router.push(`/admin/reversements${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
      <div className="champ-bloc" style={{ maxWidth: 260 }}>
        <label htmlFor="statut">Filtrer par statut</label>
        <select
          id="statut"
          defaultValue={statut}
          onChange={(e) => {
            const params = new URLSearchParams();
            if (e.target.value) params.set("statut", e.target.value);
            if (tri) params.set("tri", tri);
            naviguer(params);
          }}
        >
          {STATUTS_FILTRE.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="champ-bloc" style={{ maxWidth: 260 }}>
        <label htmlFor="tri">Trier par date de demande</label>
        <select
          id="tri"
          defaultValue={tri}
          onChange={(e) => {
            const params = new URLSearchParams();
            if (statut) params.set("statut", statut);
            if (e.target.value) params.set("tri", e.target.value);
            naviguer(params);
          }}
        >
          <option value="recent">Plus récent d&apos;abord</option>
          <option value="ancien">Plus ancien d&apos;abord</option>
        </select>
      </div>
    </div>
  );
}
