import Header from "@/components/Header";
import FormulaireCreation from "@/components/FormulaireCreation";
import { creerClientServeur } from "@/lib/supabase-server";
import { getPaysActifs } from "@/lib/pays";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Créer un événement — XwézanEvent",
};

// Messages des refus de publierEvenement (./actions.ts, paramètre ?erreur=).
const MESSAGES_ERREUR: Record<string, string> = {
  champs: "Remplis les champs obligatoires : nom, date de début, lieu, ville et pays.",
  dates: "La date de fin ne peut pas précéder la date de début.",
  date_passee: "La date de l'événement est déjà passée. Choisis une date à partir d'aujourd'hui.",
  pays: "Ce pays n'est pas disponible pour le moment.",
  affiche: "L'envoi d'une image a échoué. Rien n'a été enregistré, réessaie.",
};

export default async function Creer({ searchParams }: { searchParams: { erreur?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/creer");

  const paysDisponibles = await getPaysActifs();

  return (
    <>
      <Header />
      <FormulaireCreation
        paysDisponibles={paysDisponibles}
        erreur={searchParams.erreur ? MESSAGES_ERREUR[searchParams.erreur] ?? null : null}
      />
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
