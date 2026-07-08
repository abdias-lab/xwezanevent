import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CarteEvenement from "@/components/CarteEvenement";
import BoutonOr from "@/components/BoutonOr";
import { supabase } from "@/lib/supabase";
import type { ReactNode } from "react";

// Régénération incrémentale : la page est reconstruite au plus une fois par minute
export const revalidate = 60;

/* ------------------------------------------------------------------
   Événements à l'affiche — données réelles (Supabase)
   ------------------------------------------------------------------ */
const MOIS_COURTS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

interface EventRow {
  slug: string;
  titre: string;
  categorie: string | null;
  ville: string;
  lieu: string;
  date_debut: string; // YYYY-MM-DD
  affiche_url: string | null;
  ticket_types: { prix: number }[];
}

interface CarteData {
  id: string;
  titre: string;
  categorie: string;
  lieu: string;
  prix: number;
  jour: string;
  mois: string;
  image: string;
  href: string;
}

/**
 * Récupère les événements publiés avec le prix de leur ticket_type le moins
 * cher (pour l'affichage « à partir de X FCFA »), triés par date.
 */
async function getEvenementsAffiche(): Promise<CarteData[]> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "slug, titre, categorie, ville, lieu, date_debut, affiche_url, ticket_types(prix)"
    )
    .eq("statut", "publie")
    .order("date_debut", { ascending: true });

  if (error) {
    console.error("[accueil] échec de récupération des événements :", error.message);
    return [];
  }

  return (data as EventRow[]).map((ev) => {
    const [, mois, jour] = ev.date_debut.split("-");
    const prix = ev.ticket_types.length
      ? Math.min(...ev.ticket_types.map((t) => t.prix))
      : 0;

    return {
      id: ev.slug,
      titre: ev.titre,
      categorie: ev.categorie ?? "Événement",
      lieu: `${ev.lieu}, ${ev.ville}`,
      prix,
      jour,
      mois: MOIS_COURTS[parseInt(mois, 10) - 1] ?? "",
      image: ev.affiche_url ?? "/images/vodun-days.jpg",
      href: `/evenement/${ev.slug}`,
    };
  });
}

const CATEGORIES: { nom: ReactNode; nb: string; glyphe: ReactNode }[] = [
  {
    nom: "Concerts",
    nb: "128 événements",
    glyphe: (
      <>
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </>
    ),
  },
  {
    nom: "Festivals",
    nb: "42 événements",
    glyphe: (
      <>
        <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Z" />
        <path d="M12 22V12M3 7l9 5 9-5" />
      </>
    ),
  },
  {
    nom: "Culture & Vodun",
    nb: "36 événements",
    glyphe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18M3 12h18M6 6c4 3 8 3 12 0M6 18c4-3 8-3 12 0" />
      </>
    ),
  },
  {
    nom: "Soirées",
    nb: "94 événements",
    glyphe: (
      <>
        <path d="M8 21h8M12 17v4M6 3h12v5a6 6 0 0 1-12 0V3Z" />
        <path d="M6 5H3v2a4 4 0 0 0 3 3.87M18 5h3v2a4 4 0 0 1-3 3.87" />
      </>
    ),
  },
  {
    nom: "Sport",
    nb: "21 événements",
    glyphe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18M3 12h18" />
      </>
    ),
  },
  {
    nom: "Conférences",
    nb: "17 événements",
    glyphe: (
      <>
        <path d="M3 21v-2a6 6 0 0 1 6-6h0a6 6 0 0 1 6 6v2" />
        <circle cx="9" cy="8" r="4" />
        <path d="M17 11h5M19.5 8.5v5" />
      </>
    ),
  },
];

const VILLES = [
  { rang: "01", nom: "Cotonou", detail: "186 événements à venir" },
  { rang: "02", nom: "Porto-Novo", detail: "54 événements à venir" },
  { rang: "03", nom: "Ouidah", detail: "31 événements à venir" },
  { rang: "04", nom: "Abomey", detail: "19 événements à venir" },
  { rang: "05", nom: "Parakou", detail: "14 événements à venir" },
  { rang: "06", nom: "Grand-Popo", detail: "9 événements à venir" },
];

const TICKER = [
  { date: "10 JAN", texte: "Vodun Days · Ouidah" },
  { date: "17 JAN", texte: "Nuit de l'Afrobeat · Cotonou" },
  { date: "24 JAN", texte: "Cotonou Comedy Night · Palais des Congrès" },
  { date: "31 JAN", texte: "Festival des Masques · Porto-Novo" },
  { date: "07 FÉV", texte: "Marathon de Cotonou · Boulevard de la Marina" },
  { date: "14 FÉV", texte: "Soirée Zouk & Love · Fidjrossè Plage" },
];

export default async function Accueil() {
  const evenements = await getEvenementsAffiche();

  return (
    <>
      <Header />

      {/* ======================= HERO ======================= */}
      <div className="hero">
        <div className="applique" aria-hidden="true" />
        <div className="hero-inner">
          <span className="eyebrow">La billetterie du Bénin</span>
          <h1>
            Chope ta place,
            <br />
            vis <span className="fete">la fête.</span>
          </h1>
          <p className="lede">
            Concerts, festivals, soirées, culture — découvrez tout ce qui se
            passe près de chez vous et réservez en quelques secondes.{" "}
            <strong>Paiement Mobile Money, billet QR instantané.</strong>
          </p>

          <form className="recherche" role="search" aria-label="Rechercher un événement">
            <div className="champ">
              <label htmlFor="q">Quoi</label>
              <input id="q" name="q" type="text" placeholder="Concert, festival, soirée…" />
            </div>
            <div className="champ">
              <label htmlFor="ou">Où</label>
              <select id="ou" name="ou" defaultValue="Tout le Bénin">
                <option>Tout le Bénin</option>
                <option>Cotonou</option>
                <option>Porto-Novo</option>
                <option>Ouidah</option>
                <option>Abomey</option>
                <option>Parakou</option>
                <option>Grand-Popo</option>
              </select>
            </div>
            <div className="champ">
              <label htmlFor="quand">Quand</label>
              <select id="quand" name="quand" defaultValue="N'importe quand">
                <option>N&apos;importe quand</option>
                <option>Ce week-end</option>
                <option>Cette semaine</option>
                <option>Ce mois-ci</option>
              </select>
            </div>
            <BoutonOr type="submit">Rechercher</BoutonOr>
          </form>

          <div className="confiance">
            <span className="pastille">
              <span className="dot-mtn" aria-hidden="true" />
              MTN Mobile Money
            </span>
            <span className="pastille">
              <span className="dot-moov" aria-hidden="true" />
              Moov Money
            </span>
            <span className="pastille">
              <span className="dot-qr" aria-hidden="true" />
              E-billet QR code immédiat
            </span>
          </div>
        </div>
      </div>

      {/* ======================= TICKER ======================= */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-piste">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span key={i}>
              <b>{item.date}</b> — {item.texte}
            </span>
          ))}
        </div>
      </div>

      {/* ======================= À L'AFFICHE ======================= */}
      <section className="section" id="evenements">
        <div className="contenu">
          <div className="entete-section">
            <h2 className="titre-section">À l&apos;affiche cette semaine</h2>
            <a className="tout" href="/evenements">
              Tous les événements →
            </a>
          </div>

          {evenements.length > 0 ? (
            <div className="grille-events">
              {evenements.map((ev) => (
                <CarteEvenement key={ev.id} {...ev} />
              ))}
            </div>
          ) : (
            <div className="etat-vide">
              <div className="etat-vide-glyphe" aria-hidden="true">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
              </div>
              <h3>Aucun événement à l&apos;affiche pour l&apos;instant</h3>
              <p>
                Les prochaines dates arrivent très bientôt. Revenez vite —
                ou publiez le vôtre dès maintenant.
              </p>
              <BoutonOr href="/creer">Publier un événement</BoutonOr>
            </div>
          )}
        </div>
      </section>

      {/* ======================= CATÉGORIES ======================= */}
      <section className="section sec-cat" id="categories">
        <div className="applique" aria-hidden="true" />
        <div className="contenu" style={{ position: "relative" }}>
          <div className="entete-section">
            <h2 className="titre-section">Explorez par envie</h2>
          </div>
          <div className="grille-cat">
            {CATEGORIES.map((cat, i) => (
              <a className="tuile" href="#" key={i}>
                <span className="glyphe" aria-hidden="true">
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.6"
                  >
                    {cat.glyphe}
                  </svg>
                </span>
                <span className="nom">{cat.nom}</span>
                <span className="nb">{cat.nb}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= VILLES ======================= */}
      <section className="section" id="villes">
        <div className="contenu">
          <div className="entete-section">
            <h2 className="titre-section">Que faire ce soir à…</h2>
          </div>
          <div className="liste-villes">
            {VILLES.map((v) => (
              <a className="ville" href="#" key={v.rang}>
                <span className="rang">{v.rang}</span>
                <span className="nom-ville">{v.nom}</span>
                <span className="detail">{v.detail}</span>
                <span className="fleche" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= ORGANISATEURS ======================= */}
      <section className="section organisateur" id="organisateur">
        <div className="applique" aria-hidden="true" />
        <div className="orga-inner">
          <div>
            <h2>Vous organisez ? Vendez vos billets ici.</h2>
            <p>
              Publiez votre événement en 10 minutes, encaissez par Mobile Money,
              suivez vos ventes en temps réel et contrôlez les entrées avec le
              scan QR. Vos revenus sont reversés directement sur votre compte
              MoMo ou Moov.
            </p>
            <BoutonOr href="/creer">Créer mon événement</BoutonOr>
          </div>
          <div className="six">
            <div className="chiffre">
              6<sup>%</sup>
            </div>
            <div className="legende">de commission, c&apos;est tout</div>
            <p className="note">
              Pas d&apos;abonnement, pas de frais cachés. Vous ne payez que si
              vous vendez.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
