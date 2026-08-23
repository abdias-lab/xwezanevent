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

export function ajouterJours(dateISO: string, jours: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** "10 janvier 2027" — jour sans zéro initial, mois en toutes lettres. */
export function formatDateLongue(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split("-");
  return `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
}

/**
 * "22 – 24 août 2026" (même mois), "29 août – 2 septembre 2026" (mois
 * différents), "30 décembre 2026 – 2 janvier 2027" (années différentes).
 * Sans date_fin (ou date_fin === date_debut, événement d'un seul jour) :
 * une seule date, formatDateLongue(dateDebut). `avecAnnee: false` (cartes,
 * affichage compact) : mêmes règles mais l'année n'est jamais affichée.
 */
export function formatPlageDates(
  dateDebut: string,
  dateFin: string | null,
  opts: { avecAnnee?: boolean } = {}
): string {
  const avecAnnee = opts.avecAnnee ?? true;
  if (!dateFin || dateFin === dateDebut) {
    return avecAnnee
      ? formatDateLongue(dateDebut)
      : formatDateLongue(dateDebut).replace(/ \d{4}$/, "");
  }

  const [anD, moisD, jourD] = dateDebut.split("-").map((v) => parseInt(v, 10));
  const [anF, moisF, jourF] = dateFin.split("-").map((v) => parseInt(v, 10));
  const suffixeAnnee = (a: number) => (avecAnnee ? ` ${a}` : "");

  if (anD === anF && moisD === moisF) {
    return `${jourD} – ${jourF} ${MOIS_LONGS[moisD - 1]}${suffixeAnnee(anD)}`;
  }
  if (anD === anF) {
    return `${jourD} ${MOIS_LONGS[moisD - 1]} – ${jourF} ${MOIS_LONGS[moisF - 1]}${suffixeAnnee(anD)}`;
  }
  const debut = avecAnnee ? formatDateLongue(dateDebut) : `${jourD} ${MOIS_LONGS[moisD - 1]}`;
  const fin = avecAnnee ? formatDateLongue(dateFin) : `${jourF} ${MOIS_LONGS[moisF - 1]}`;
  return `${debut} – ${fin}`;
}

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

/**
 * "Dim 23 août" — jour de semaine abrégé + jour + mois, sans année. Repère
 * de groupe sur /evenements (un seul jour) ; la casse (majuscules) est
 * gérée par CSS `text-transform`, pas dans la chaîne elle-même.
 */
export function formatEnTeteJour(dateISO: string): string {
  const jourSemaine = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  const [, mois, jour] = dateISO.split("-");
  return `${JOURS_COURTS[jourSemaine]} ${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]}`;
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
