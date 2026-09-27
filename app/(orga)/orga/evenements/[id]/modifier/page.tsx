import Header from "@/components/Header";
import FormulaireEdition from "@/components/FormulaireEdition";
import { modifierEvenement } from "./actions";
import { creerClientServeur } from "@/lib/supabase-server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modifier l'événement — XwézanEvent",
};

// Messages des refus de modifierEvenement (./actions.ts, paramètre ?erreur=).
const MESSAGES_ERREUR: Record<string, string> = {
  champs: "La date de début est obligatoire.",
  dates: "La date de fin ne peut pas précéder la date de début.",
  date_passee:
    "Impossible de placer l'événement à une date passée. Choisis une date à partir d'aujourd'hui.",
  date_avancee:
    "Des billets ont déjà été vendus : tu peux repousser l'événement, mais pas avancer sa date. Pour un cas exceptionnel, écris à contact@xwezan.com.",
  verification: "Vérification impossible pour le moment. Aucune modification n'a été enregistrée, réessaie dans un instant.",
  affiche: "L'envoi d'une image a échoué. Aucune modification n'a été enregistrée, réessaie.",
};

interface EventRow {
  id: string;
  titre: string;
  description: string | null;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  ville: string;
  lieu: string;
  organisateur_id: string;
  est_demo: boolean;
  pays: { nom: string; drapeau: string } | null;
  event_categories: { categorie: string; ordre: number }[];
  event_images: { url: string; principale: boolean; ordre: number }[];
}

export default async function ModifierEvenementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erreur?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/orga/evenements/${params.id}/modifier`);

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, titre, description, date_debut, date_fin, heure, ville, lieu, organisateur_id, est_demo, pays:pays_code(nom, drapeau), event_categories(categorie, ordre), event_images(url, principale, ordre)"
    )
    .eq("id", params.id)
    .order("ordre", { foreignTable: "event_categories", ascending: true })
    .order("ordre", { foreignTable: "event_images", ascending: true })
    .maybeSingle();
  if (error) console.error("[orga/modifier] échec chargement événement :", error.message);

  const event = data as unknown as EventRow | null;
  // Propriété vérifiée ici (page) ET dans l'action serveur modifierEvenement
  // (défense en profondeur, comme le reste des routes organisateur).
  if (!event || event.organisateur_id !== user.id) notFound();
  // Un événement vitrine/démo n'a pas de sens à éditer par ce canal.
  if (event.est_demo) redirect("/orga");

  const modifierAvecId = modifierEvenement.bind(null, event.id);

  return (
    <>
      <Header />
      <FormulaireEdition
        action={modifierAvecId}
        erreur={searchParams.erreur ? MESSAGES_ERREUR[searchParams.erreur] ?? null : null}
        titre={event.titre}
        lieu={event.lieu}
        ville={event.ville}
        pays={event.pays ? `${event.pays.drapeau} ${event.pays.nom}` : null}
        description={event.description ?? ""}
        dateDebut={event.date_debut}
        dateFin={event.date_fin}
        heure={event.heure ?? ""}
        categoriesInitiales={event.event_categories
          .slice()
          .sort((a, b) => a.ordre - b.ordre)
          .map((c) => c.categorie)}
        imagesInitiales={event.event_images
          .slice()
          .sort((a, b) => a.ordre - b.ordre)
          .map((i) => ({ url: i.url }))}
      />
      <footer className="footer-mini">
        <div className="in">
          <span>
            <Link href="/orga">← Retour à mes événements</Link>
          </span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </footer>
    </>
  );
}
