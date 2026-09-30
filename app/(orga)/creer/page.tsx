import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { aujourdhuiPortoNovo } from "@/lib/date";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import Formulaire from "@/components/v2/orga/creer/Formulaire";
import Confirmation from "@/components/v2/orga/creer/Confirmation";
import { NAV_ORGA } from "@/components/v2/navOrga";
import s from "@/components/v2/espace.module.css";
import { publierEvenement } from "./actions";

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

/**
 * Créer un événement (V2), repris de la preview (v2/creer) et branché sur
 * l'action serveur de prod `publierEvenement`. L'événement part en
 * validation ; ?envoye=<id> affiche l'écran de confirmation.
 */
export default async function Creer({ searchParams }: { searchParams: { erreur?: string; envoye?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/creer");

  const [{ data: profil }, { data: paysData }] = await Promise.all([
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
    supabase.from("pays").select("code, nom, taux_commission_defaut").eq("actif", true).order("ordre", { ascending: true }),
  ]);
  const nom = profil?.nom_public || profil?.nom || user.email || "organisateur";

  // Écran de confirmation : seulement pour un événement de cet organisateur.
  let confirmation = null;
  if (searchParams.envoye) {
    const { data: ev } = await supabase
      .from("events")
      .select("slug, titre, date_debut, date_fin, heure, lieu, ville, affiche_url, event_categories(categorie, ordre), ticket_types(prix)")
      .eq("id", searchParams.envoye)
      .eq("organisateur_id", user.id)
      .maybeSingle();
    if (ev) {
      const categories = [...(ev.event_categories as { categorie: string; ordre: number }[])].sort((a, b) => a.ordre - b.ordre).map((c) => c.categorie);
      const prix = (ev.ticket_types as { prix: number }[]).map((t) => t.prix);
      confirmation = (
        <Confirmation
          email={user.email ?? ""}
          apercu={{
            slug: ev.slug,
            titre: ev.titre,
            categorie: categories[0] ?? "Catégorie",
            lieu: ev.lieu,
            ville: ev.ville,
            debut: ev.date_debut,
            fin: ev.date_fin ?? undefined,
            heure: ev.heure ? String(ev.heure).slice(0, 5) : "Heure",
            prixMin: prix.length ? Math.min(...prix) : 0,
            prixLibelle: prix.length ? undefined : "Tarifs à définir",
            organisateur: "",
            tags: categories,
            image: ev.affiche_url,
          }}
        />
      );
    }
  }

  return (
    <Coquille nav={NAV_ORGA} actif="creer" compte={{ nom, email: user.email ?? "" }}>
      <Link href="/orga" className={s.retour}>
        <Icon name="back" /> Tableau de bord
      </Link>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Créer un événement</h1>
          <p className={s.sousTitre}>Quatre blocs à remplir, l&apos;aperçu se met à jour au fil de la saisie.</p>
        </div>
      </div>
      {confirmation ?? (
        <Formulaire
          action={publierEvenement}
          pays={(paysData ?? []).map((p) => ({ code: p.code, nom: p.nom, taux: Number(p.taux_commission_defaut) }))}
          aujourdhui={aujourdhuiPortoNovo()}
          erreurServeur={searchParams.erreur ? (MESSAGES_ERREUR[searchParams.erreur] ?? null) : null}
        />
      )}
    </Coquille>
  );
}
