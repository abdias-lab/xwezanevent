import Header from "@/components/Header";
import Billetterie from "@/components/Billetterie";
import AfficheEvenement from "@/components/AfficheEvenement";
import { getEvenementParSlug } from "@/lib/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 60;

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

function formatDate(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split("-");
  return `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
}

function formatHeure(heure: string | null): string | null {
  if (!heure) return null;
  const [h, m] = heure.split(":");
  return `${h}h${m}`;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) return { title: "Événement introuvable — XwézanEvent" };
  return {
    title: `${ev.titre} — XwézanEvent`,
    description: ev.description ?? `${ev.titre} · ${ev.lieu}, ${ev.ville}`,
  };
}

export default async function EvenementDetail({
  params,
}: {
  params: { slug: string };
}) {
  const ev = await getEvenementParSlug(params.slug);
  if (!ev) notFound();

  const heure = formatHeure(ev.heure);
  const placesTotales = ev.ticketTypes.reduce((s, t) => s + t.disponibles, 0);

  return (
    <>
      <Header />

      {/* --------------------------- BANNIÈRE --------------------------- */}
      <div className="banniere">
        <AfficheEvenement
          className="photo"
          src={ev.affiche_url}
          alt={ev.titre}
          fill
          priority
          sizes="100vw"
        />
        <div className="voile" aria-hidden="true" />
      </div>

      {/* --------------------------- EN-TÊTE --------------------------- */}
      <div className="entete-ev">
        <div className="badges-ev">
          {ev.categorie && <span className="badge-ev">{ev.categorie}</span>}
          {placesTotales > 0 && (
            <span className="badge-ev">
              👥 {placesTotales.toLocaleString("fr-FR")} places
            </span>
          )}
        </div>
        <h1>{ev.titre}</h1>
        <div className="meta-ev">
          <span>📅 {formatDate(ev.date_debut)}{heure ? ` · ${heure}` : ""}</span>
          <span>📍 {ev.lieu}, {ev.ville}</span>
        </div>
      </div>

      {/* ---------------------------- CORPS ---------------------------- */}
      <div className="corps-ev">
        <div className="colonne">
          {ev.description && (
            <>
              <h2>À propos</h2>
              {ev.description.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </>
          )}

          <h2>Infos pratiques</h2>
          <div className="pratique">
            <div className="info-p">
              <div className="l">📅 Date</div>
              <div className="v">{formatDate(ev.date_debut)}</div>
            </div>
            {heure && (
              <div className="info-p">
                <div className="l">⏰ Heure</div>
                <div className="v">{heure}</div>
              </div>
            )}
            <div className="info-p">
              <div className="l">📍 Ville</div>
              <div className="v">{ev.ville}</div>
            </div>
            <div className="info-p">
              <div className="l">💳 Paiement</div>
              <div className="v">MTN &amp; Moov Money</div>
            </div>
          </div>

          <h2>Lieu</h2>
          <div className="carte-lieu">
            <svg
              className="routes"
              viewBox="0 0 400 190"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
            >
              <path
                d="M0 60h400M0 130h400M80 0v190M200 0v190M310 0v190"
                stroke="currentColor"
                strokeWidth="1.4"
                opacity=".5"
              />
              <path
                d="M0 95q100-30 200 0t200 0"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                opacity=".7"
              />
            </svg>
            <span className="epingle">📍 {ev.lieu}, {ev.ville}</span>
          </div>
        </div>

        {ev.estTermine ? (
          <aside className="billetterie" aria-label="Billetterie">
            <h2>Événement terminé</h2>
            <p className="limite">
              Cet événement est passé — la billetterie n&apos;est plus disponible.
            </p>
            <Link className="btn btn-ghost" href="/evenements" style={{ display: "block", textAlign: "center" }}>
              Voir les événements à venir →
            </Link>
          </aside>
        ) : (
          <Billetterie slug={ev.slug} ticketTypes={ev.ticketTypes} />
        )}
      </div>

      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/evenements">← Tous les événements</Link>
          </span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
