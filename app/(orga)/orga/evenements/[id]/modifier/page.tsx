import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { creerClientServeur } from "@/lib/supabase-server";
import { aujourdhuiPortoNovo } from "@/lib/date";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import FormulaireModif from "@/components/v2/orga/modifier/FormulaireModif";
import { NAV_ORGA } from "@/components/v2/navOrga";
import { STATUTS, StatutEvt, type Statut } from "@/components/v2/statuts";
import s from "@/components/v2/espace.module.css";
import { modifierEvenement } from "./actions";

export const metadata: Metadata = {
  title: "Modifier l'événement — XwézanEvent",
};

/** Statuts modifiables (même liste que la fiche et que modifierEvenement). */
const MODIFIABLE = new Set<Statut>(["brouillon", "en_validation", "publie"]);

// Messages des refus de modifierEvenement (./actions.ts, paramètre ?erreur=).
const MESSAGES_ERREUR: Record<string, ReactNode> = {
  champs: "La date de début est obligatoire.",
  dates: "La date de fin ne peut pas précéder la date de début.",
  date_passee: "Impossible de placer l'événement à une date passée. Choisis une date à partir d'aujourd'hui.",
  date_avancee: (
    <>
      Des billets ont déjà été vendus : tu peux repousser l&apos;événement, mais pas avancer sa date. Pour un cas exceptionnel, écris à{" "}
      <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>.
    </>
  ),
  verification: "Vérification impossible pour le moment. Aucune modification n'a été enregistrée, réessaie dans un instant.",
  affiche: "L'envoi d'une image a échoué. Aucune modification n'a été enregistrée, réessaie.",
};

interface EventRow {
  id: string;
  slug: string;
  titre: string;
  description: string | null;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  ville: string;
  lieu: string;
  statut: Statut;
  organisateur_id: string;
  est_demo: boolean;
  pays: { nom: string } | null;
  event_categories: { categorie: string; ordre: number }[];
  event_images: { url: string; principale: boolean; ordre: number }[];
  ticket_types: { nom: string; prix: number; quantite_totale: number; quantite_vendue: number }[];
}

/**
 * Modifier un événement (V2), repris de la preview
 * (v2/orga/evenements/[id]/modifier) et branché sur l'action serveur de prod
 * `modifierEvenement`. ?enregistre=1 : retour après enregistrement réussi.
 */
export default async function ModifierEvenementPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { erreur?: string; enregistre?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/orga/evenements/${params.id}/modifier`);

  const [{ data, error }, { data: profil }] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, slug, titre, description, date_debut, date_fin, heure, ville, lieu, statut, organisateur_id, est_demo, pays:pays_code(nom), event_categories(categorie, ordre), event_images(url, principale, ordre), ticket_types(nom, prix, quantite_totale, quantite_vendue)"
      )
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
  ]);
  if (error) console.error("[orga/modifier] échec chargement événement :", error.message);

  const event = data as unknown as EventRow | null;
  // Propriété vérifiée ici (page) ET dans l'action serveur modifierEvenement
  // (défense en profondeur, comme le reste des routes organisateur).
  if (!event || event.organisateur_id !== user.id) notFound();
  // Un événement vitrine/démo n'a pas de sens à éditer par ce canal.
  if (event.est_demo) redirect("/orga");

  const nom = profil?.nom_public || profil?.nom || user.email || "organisateur";
  const fiche = `/orga/evenements/${event.id}`;
  const categories = [...event.event_categories].sort((a, b) => a.ordre - b.ordre).map((c) => c.categorie);
  const images = [...event.event_images].sort((a, b) => a.ordre - b.ordre).map((i) => ({ url: i.url, principale: i.principale }));
  const tarifs = event.ticket_types.map((t) => ({ nom: t.nom, prix: t.prix, total: t.quantite_totale, vendus: t.quantite_vendue }));
  const vendus = tarifs.reduce((n, t) => n + t.vendus, 0);
  const heure = event.heure ? event.heure.slice(0, 5) : "";

  return (
    <Coquille nav={NAV_ORGA} actif="accueil" compte={{ nom, email: user.email ?? "" }}>
      <Link href={fiche} className={s.retour}>
        <Icon name="back" /> {event.titre}
      </Link>
      <div className={s.entete}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <StatutEvt statut={event.statut} />
          </div>
          <h1 className={s.titre}>Modifier l&apos;événement</h1>
          <p className={s.sousTitre}>Description, catégories, date et images. Les changements sont visibles dès l&apos;enregistrement.</p>
        </div>
      </div>

      {MODIFIABLE.has(event.statut) ? (
        <FormulaireModif
          // Remonte le formulaire quand la ligne en base change (après
          // enregistrement) : l'état local repart des valeurs enregistrées.
          key={JSON.stringify([event.description, event.date_debut, event.date_fin, heure, categories, images])}
          action={modifierEvenement.bind(null, event.id)}
          e={{
            id: event.id,
            slug: event.slug,
            titre: event.titre,
            lieu: event.lieu,
            ville: event.ville,
            pays: event.pays?.nom ?? null,
            description: event.description ?? "",
            categories,
            debut: event.date_debut,
            fin: event.date_fin,
            heure,
            images,
            tarifs,
          }}
          vendus={vendus}
          aujourdhui={aujourdhuiPortoNovo()}
          erreurServeur={searchParams.erreur ? (MESSAGES_ERREUR[searchParams.erreur] ?? null) : null}
          enregistre={searchParams.enregistre === "1"}
        />
      ) : (
        <div className={s.vide}>
          <Icon name="shield" size={32} />
          <p className={s.videTitre}>Cet événement n&apos;est plus modifiable</p>
          <p className={s.videTexte}>
            Il est « {STATUTS[event.statut].toLowerCase()} ». Seuls les événements en brouillon, en validation ou en vente peuvent être modifiés.
          </p>
          <Link href={fiche} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
            <Icon name="back" /> Retour à la fiche
          </Link>
        </div>
      )}
    </Coquille>
  );
}
