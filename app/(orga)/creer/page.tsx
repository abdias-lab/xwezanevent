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

export default async function Creer() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/creer");

  const paysDisponibles = await getPaysActifs();

  return (
    <>
      <Header />
      <FormulaireCreation paysDisponibles={paysDisponibles} />
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
