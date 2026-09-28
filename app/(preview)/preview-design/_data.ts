// Données factices en dur pour les previews. Aucune requête Supabase.

export type Evenement = {
  slug: string;
  titre: string;
  categorie: string;
  lieu: string;
  ville: string;
  debut: string; // AAAA-MM-JJ
  fin?: string; // festival multi-jours
  heure: string;
  prixMin: number; // FCFA, 0 = gratuit
  prixLibelle?: string; // remplace le prix calculé (ex. aperçu sans tarif saisi)
  organisateur: string;
  tags: string[];
  image: string | null; // null = pas d'affiche
  restantes?: number;
};

const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parse(d: string) {
  const [y, m, j] = d.split("-").map(Number);
  return { y, m: m - 1, j, dow: new Date(Date.UTC(y, m - 1, j)).getUTCDay() };
}

export function jour(d: string) {
  return String(parse(d).j).padStart(2, "0");
}
export function mois(d: string) {
  return MOIS[parse(d).m];
}
export function jourSemaine(d: string) {
  return JOURS[parse(d).dow];
}
export function dateCourte(e: Evenement) {
  const a = parse(e.debut);
  if (e.fin) {
    const b = parse(e.fin);
    return a.m === b.m && a.y === b.y ? `${a.j}–${b.j} ${MOIS[b.m]}` : `${a.j} ${MOIS[a.m]} – ${b.j} ${MOIS[b.m]}`;
  }
  return `${JOURS[a.dow]} ${a.j} ${MOIS[a.m]}`;
}
export function dateLongue(e: Evenement) {
  const a = parse(e.debut);
  if (e.fin) {
    const b = parse(e.fin);
    if (a.y !== b.y) return `Du ${a.j} ${MOIS[a.m]} ${a.y} au ${b.j} ${MOIS[b.m]} ${b.y}`;
    return a.m === b.m ? `Du ${a.j} au ${b.j} ${MOIS[b.m]} ${b.y}` : `Du ${a.j} ${MOIS[a.m]} au ${b.j} ${MOIS[b.m]} ${b.y}`;
  }
  return `${JOURS[a.dow]} ${a.j} ${MOIS[a.m]} ${a.y}`;
}
export function fcfa(n: number) {
  if (n === 0) return "Gratuit";
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "\u00A0FCFA";
}
export function prixDes(e: Evenement) {
  if (e.prixLibelle) return e.prixLibelle;
  return e.prixMin === 0 ? "Gratuit" : `Dès ${fcfa(e.prixMin)}`;
}
export function initiales(titre: string) {
  return titre
    .split(/\s+/)
    .filter((m) => m.length > 2)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}

/**
 * Affiches factices SVG (data URI). Formats volontairement variés pour tester
 * le recadrage : portrait 2:3, bandeau 3:1, carré.
 */
function affiche(w: number, h: number, a: string, b: string, forme: "soleil" | "vagues" | "losanges") {
  const motifs = {
    soleil: `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.28}" fill="${b}" opacity=".85"/><circle cx="${w * 0.5}" cy="${h * 0.42}" r="${Math.min(w, h) * 0.4}" fill="none" stroke="${b}" stroke-width="${w * 0.01}" opacity=".5"/>`,
    vagues: [0, 1, 2, 3, 4]
      .map((i) => `<path d="M0 ${h * (0.5 + i * 0.09)} Q${w * 0.25} ${h * (0.42 + i * 0.09)} ${w * 0.5} ${h * (0.5 + i * 0.09)} T${w} ${h * (0.5 + i * 0.09)}" fill="none" stroke="${b}" stroke-width="${w * 0.012}" opacity="${0.9 - i * 0.15}"/>`)
      .join(""),
    losanges: [0, 1, 2]
      .map((i) => `<path d="M${w / 2} ${h * (0.15 + i * 0.2)} L${w * 0.85} ${h * (0.35 + i * 0.2)} L${w / 2} ${h * (0.55 + i * 0.2)} L${w * 0.15} ${h * (0.35 + i * 0.2)}Z" fill="none" stroke="${b}" stroke-width="${w * 0.012}" opacity="${0.9 - i * 0.2}"/>`)
      .join(""),
  }[forme];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#0b0806"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${motifs}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Vraie image raster 16×16 px, étirée par le navigateur : simule une affiche
// uploadée en très basse résolution (flou garanti, le recadrage doit tenir).
const BASSE_RES =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAABaUlEQVR4nH2R0abmMBRG8xTrGSKxK5VKpXZsSimllBLyhue95kHm4tyMmTk/63Ktm+9zwzMCIzKEMTESY2ZkxsIojJVRGRtDGY1huO7pgR7pQp/oiT7TM32hF/pKr/SNrvRGN9zreQNv5BXeiTfx68v+5K28G6/yNl7DPZ4n8EQe4Zn+tr95Nh7laTyGuz134I7c8n/7m1u5G7fhLs8VuCLXx+BSrsZluNNzBs7I+TE4lbNxGu7wHIEjcnwMDuVoHIbbPXtgj+wfg13ZG7vhzGMBi5hgP6xkG6ZYwwynHg1oRAWd0H9+0IpuqKINNVz11ECNVKFO1ESdqZm6UAt1pVbqRlVqoxqueEqgRIpQJkqizJRMWSiFslIqZaMopVEMlz05kCNZyBM5kWdyJi/kQl7JlbyRldzIhkueFEiRJKSJlEgzKZMWUiGtpEraSEpqJMOJRwISEUEmJCEzkpEFKciKVGRDFGmI8RuY5+GTYg+TwQAAAABJRU5ErkJggg==";

export const EVENEMENTS: Evenement[] = [
  {
    slug: "festival-vodoun-jazz",
    titre: "Festival Vodoun Jazz",
    categorie: "Festival",
    lieu: "Plage de Fidjrossè",
    ville: "Cotonou",
    debut: "2026-11-13",
    fin: "2026-11-15",
    heure: "17:00",
    prixMin: 5000,
    organisateur: "Ouidah Live",
    tags: ["Jazz", "Afrobeat", "Plein air"],
    image: affiche(600, 900, "#7a3b12", "#e4a93f", "soleil"), // portrait 2:3, recadré
    restantes: 42,
  },
  {
    slug: "nuit-zinli",
    titre: "Nuit Zinli : Cotonou by Night",
    categorie: "Concert",
    lieu: "Palais des Congrès",
    ville: "Cotonou",
    debut: "2026-10-03",
    heure: "20:00",
    prixMin: 3000,
    organisateur: "Yovo Prod",
    tags: ["Zinli", "Afrobeat", "Live"],
    image: affiche(1200, 400, "#8a2f18", "#f3c96b", "vagues"), // bandeau 3:1
  },
  {
    slug: "soiree-amapiano",
    titre: "Soirée Amapiano",
    categorie: "Soirée",
    lieu: "Ganhi Rooftop",
    ville: "Cotonou",
    debut: "2026-10-03",
    heure: "22:00",
    prixMin: 2000,
    organisateur: "Ganhi Nights",
    tags: ["Amapiano", "DJ"],
    image: null, // sans affiche
  },
  {
    slug: "rire-au-palais",
    titre: "Rire au Palais : plateau d'humour",
    categorie: "Culture",
    lieu: "Centre Songhaï",
    ville: "Porto-Novo",
    debut: "2026-10-10",
    heure: "19:00",
    prixMin: 0,
    organisateur: "Rire Bénin",
    tags: ["Humour", "Famille"],
    image: BASSE_RES, // 16×16 px étiré
  },
  {
    slug: "gospel-en-fete",
    titre: "Gospel en Fête",
    categorie: "Concert",
    lieu: "Stade de l'Amitié",
    ville: "Cotonou",
    debut: "2026-10-17",
    heure: "16:00",
    prixMin: 1000,
    organisateur: "Église Vivante",
    tags: ["Gospel", "Famille", "Chorale", "Plein air"],
    image: affiche(800, 800, "#5b2a3b", "#f3c96b", "soleil"),
  },
  {
    slug: "nuit-des-musees-abomey",
    titre: "Nuit des Musées : Abomey Royal",
    categorie: "Culture",
    lieu: "Palais royaux d'Abomey",
    ville: "Abomey",
    debut: "2026-10-24",
    heure: "18:30",
    prixMin: 1500,
    organisateur: "Patrimoine Vivant",
    tags: ["Patrimoine", "Visite"],
    image: null,
  },
  {
    slug: "rumba-sur-le-lac",
    titre: "Rumba sur le Lac",
    categorie: "Concert",
    lieu: "Cité lacustre de Ganvié",
    ville: "Abomey-Calavi",
    debut: "2026-11-01",
    heure: "19:30",
    prixMin: 4000,
    organisateur: "Lac Sessions",
    tags: ["Rumba", "Live", "Dîner"],
    image: affiche(900, 600, "#1f4a55", "#e4a93f", "vagues"),
  },
  {
    slug: "grand-popo-beach-party",
    titre: "Grand-Popo Beach Party",
    categorie: "Soirée",
    lieu: "Plage de Grand-Popo",
    ville: "Grand-Popo",
    debut: "2026-11-21",
    heure: "21:00",
    prixMin: 3500,
    organisateur: "Mono Events",
    tags: ["DJ", "Plage"],
    image: affiche(640, 360, "#3d2a5c", "#f3c96b", "losanges"),
    restantes: 18,
  },
];

// « Sport » n'a volontairement aucun événement : sert à montrer l'état vide.
export const CATEGORIES = ["Tout", "Concert", "Festival", "Soirée", "Culture", "Sport"];

export const EVENEMENT_DETAIL = {
  ...EVENEMENTS[0],
  lieuAdresse: "Route des Pêches, Fidjrossè, Cotonou",
  description:
    "Trois soirées face à l'océan : jazz, afrobeat et rythmes vodoun réinventés. Scène principale au coucher du soleil, marché d'artisans et cuisine de rue toute la soirée. Les portes ouvrent à 17 h, les concerts démarrent à 19 h.",
  programme: [
    { jour: "Ven. 13", titre: "Ouverture : Orchestre Tchéga", heure: "19:00" },
    { jour: "Sam. 14", titre: "Angèle Sossa & les Tambours de Ouidah", heure: "19:30" },
    { jour: "Dim. 15", titre: "Grande clôture : jam collective", heure: "18:00" },
  ],
  tarifs: [
    { id: "std", nom: "Pass Standard", detail: "Accès aux 3 soirées", prix: 5000 },
    { id: "vip", nom: "Pass VIP", detail: "Zone face scène et boisson offerte", prix: 15000 },
    { id: "table", nom: "Table 6 personnes", detail: "Table réservée, service au siège", prix: 90000 },
  ],
};

export const SLOGAN = "Mì wá djawá !";

/** Paramètres de page qui forcent un état pour le relire (vide, chargement, sans affiche). */
export type EtatForce = "liste" | "chargement" | "vide";
export function etatDepuis(v: string | string[] | undefined): EtatForce {
  return v === "chargement" || v === "vide" ? v : "liste";
}
