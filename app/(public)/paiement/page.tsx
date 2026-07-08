import Header from "@/components/Header";
import TunnelPaiement, { type LigneCommande } from "@/components/TunnelPaiement";
import BoutonOr from "@/components/BoutonOr";
import { getEvenementParSlug } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Paiement — XwézanEvent",
};

const FRAIS_TAUX = 0.06;

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDateHeure(dateISO: string, heure: string | null): string {
  const [annee, mois, jour] = dateISO.split("-");
  const d = `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
  if (!heure) return d;
  const [h, m] = heure.split(":");
  return `${d} · ${h}h${m}`;
}

export default async function Paiement({
  searchParams,
}: {
  searchParams: { ev?: string; t?: string | string[] };
}) {
  const slug = searchParams.ev;
  if (!slug) notFound();

  const ev = await getEvenementParSlug(slug);
  if (!ev) notFound();

  // Sélection : liste de "ticketTypeId:quantité"
  const entrees = Array.isArray(searchParams.t)
    ? searchParams.t
    : searchParams.t
      ? [searchParams.t]
      : [];

  const parId = new Map(ev.ticketTypes.map((t) => [t.id, t]));
  const lignes: LigneCommande[] = [];
  const selection: string[] = [];
  for (const entree of entrees) {
    const [id, qStr] = entree.split(":");
    const tt = parId.get(id);
    const q = parseInt(qStr, 10);
    if (!tt || !Number.isFinite(q) || q <= 0) continue;
    const qte = Math.min(q, tt.disponibles);
    if (qte <= 0) continue;
    lignes.push({ nom: tt.nom, qte, montant: tt.prix * qte });
    selection.push(`${tt.id}:${qte}`);
  }

  // Panier vide / sélection invalide : message clair + retour
  if (lignes.length === 0) {
    return (
      <>
        <Header />
        <main className="corps-p">
          <div className="etat-vide" style={{ marginTop: 96 }}>
            <div className="etat-vide-glyphe" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 6h15l-1.5 9h-12z" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
                <path d="M6 6 5 3H2" />
              </svg>
            </div>
            <h3>Ton panier est vide</h3>
            <p>Choisis d&apos;abord tes billets sur la page de l&apos;événement.</p>
            <BoutonOr href={`/evenement/${slug}`}>Retour à l&apos;événement</BoutonOr>
          </div>
        </main>
        <footer className="footer-mini">
          <div className="in">
            <span>
              <Link href="/evenements">← Tous les événements</Link>
            </span>
            <span className="fon">Mì wá dó gbè !&nbsp;· La fête vous attend.</span>
          </div>
        </footer>
      </>
    );
  }

  const sousTotal = lignes.reduce((s, l) => s + l.montant, 0);
  const frais = Math.round(sousTotal * FRAIS_TAUX);
  const total = sousTotal + frais;

  return (
    <>
      <Header />

      <main className="corps-p">
        <Link className="retour" href={`/evenement/${slug}`}>
          ← Retour à l&apos;événement
        </Link>

        <div className="etapes" aria-label="Étapes du paiement">
          <div className="etape faite">
            <div className="rond-e">✓</div>
            <span className="le">Billets</span>
          </div>
          <div className="trait fait" />
          <div className="etape active">
            <div className="rond-e">2</div>
            <span className="le">Paiement</span>
          </div>
          <div className="trait" />
          <div className="etape">
            <div className="rond-e">3</div>
            <span className="le">Confirmation</span>
          </div>
        </div>

        <TunnelPaiement
          slug={slug}
          selection={selection}
          titre={ev.titre}
          dateHeure={formatDateHeure(ev.date_debut, ev.heure)}
          lieu={`${ev.lieu}, ${ev.ville}`}
          affiche={ev.affiche_url ?? "/images/vodun-days.jpg"}
          lignes={lignes}
          sousTotal={sousTotal}
          frais={frais}
          total={total}
        />
      </main>

      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/evenements">← Tous les événements</Link>
          </span>
          <span className="fon">Mì wá dó gbè !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
