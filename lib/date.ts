const DECALAGE_PORTO_NOVO_MS = 60 * 60 * 1000; // UTC+1, fixe (pas d'heure d'été au Bénin)

/**
 * Date du jour (YYYY-MM-DD) dans le fuseau Africa/Porto-Novo — utilisée
 * pour décider si un événement (date_debut, une DATE sans heure) est passé.
 * Ne PAS utiliser `new Date().toISOString().slice(0, 10)` seul : ça donne
 * la date en UTC, décalée d'une heure par rapport à Porto-Novo autour de
 * minuit.
 */
export function aujourdhuiPortoNovo(): string {
  return new Date(Date.now() + DECALAGE_PORTO_NOVO_MS).toISOString().slice(0, 10);
}

function ajouterJours(dateISO: string, jours: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

export type PeriodeQuand = "aujourdhui" | "week-end" | "semaine" | "mois";

/**
 * Plage de dates [debut, fin] (inclusive, YYYY-MM-DD) pour une valeur du
 * filtre "quand", calculée à partir d'aujourd'hui en Africa/Porto-Novo.
 * "week-end" : samedi+dimanche à venir les plus proches, ou le week-end en
 * cours si on est déjà samedi ou dimanche (un événement de ce soir doit
 * apparaître). Retourne null si la valeur n'est pas reconnue (= pas de
 * filtre, "n'importe quand").
 */
export function plagePeriode(quand: string | undefined): { debut: string; fin: string } | null {
  const aujourdhui = aujourdhuiPortoNovo();
  const jourSemaine = new Date(`${aujourdhui}T00:00:00Z`).getUTCDay(); // 0=dim..6=sam

  switch (quand) {
    case "aujourdhui":
      return { debut: aujourdhui, fin: aujourdhui };
    case "week-end": {
      if (jourSemaine === 6) return { debut: aujourdhui, fin: ajouterJours(aujourdhui, 1) };
      if (jourSemaine === 0) return { debut: aujourdhui, fin: aujourdhui };
      const samedi = ajouterJours(aujourdhui, 6 - jourSemaine);
      return { debut: samedi, fin: ajouterJours(samedi, 1) };
    }
    case "semaine": {
      const joursAvantDimanche = jourSemaine === 0 ? 0 : 7 - jourSemaine;
      return { debut: aujourdhui, fin: ajouterJours(aujourdhui, joursAvantDimanche) };
    }
    case "mois": {
      const [an, mois] = aujourdhui.split("-").map(Number);
      const dernierJour = new Date(Date.UTC(an, mois, 0)).getUTCDate();
      return { debut: aujourdhui, fin: `${an}-${String(mois).padStart(2, "0")}-${String(dernierJour).padStart(2, "0")}` };
    }
    default:
      return null;
  }
}
