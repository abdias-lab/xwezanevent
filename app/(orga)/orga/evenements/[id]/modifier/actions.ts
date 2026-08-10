"use server";

import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { uploaderImageEvenement, supprimerImageEvenement } from "@/lib/images-evenement";
import { MAX_IMAGES } from "@/lib/affiche";
import { MAX_CATEGORIES } from "@/lib/categories";
import { envoyerEmail, emailUtilisateur } from "@/lib/email";
import { emailEvenementDateModifiee } from "@/lib/emails/evenement-edition";

const MOIS_LONGS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
function formatDateLongue(dateISO: string): string {
  const [annee, mois, jour] = dateISO.split("-");
  return `${parseInt(jour, 10)} ${MOIS_LONGS[parseInt(mois, 10) - 1]} ${annee}`;
}

function parserCategories(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(String(formData.get("categories") || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
      .slice(0, MAX_CATEGORIES);
  } catch {
    return [];
  }
}

function parserImagesConservees(formData: FormData): string[] {
  try {
    const parsed = JSON.parse(String(formData.get("images_conservees") || "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((u): u is string => typeof u === "string");
  } catch {
    return [];
  }
}

/**
 * Édition libre par l'organisateur de SES événements — description, date,
 * heure, images, catégories uniquement (titre/lieu/ville figés : ils sont
 * dans le slug déjà indexé et imprimés sur les billets déjà vendus). Aucune
 * repasse par validation admin pour ces champs (décision produit).
 *
 * Écriture via supabaseAdmin (service_role) : la policy RLS UPDATE sur
 * `events` est bloquée pour tout rôle authenticated
 * (20260717180000_verrouille_maj_evenements.sql), même pattern que le reste
 * des routes organisateur/admin agissant sur events.
 *
 * Si la DATE change, notifie par email tous les acheteurs ayant un billet
 * payé pour cet événement (impact majeur pour eux) — un changement d'heure
 * seule ne notifie pas.
 */
export async function modifierEvenement(eventId: string, formData: FormData) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/orga/evenements/${eventId}/modifier`);

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("id, organisateur_id, titre, slug, date_debut, est_demo, pays_code")
    .eq("id", eventId)
    .maybeSingle();

  if (!event || event.organisateur_id !== user.id) redirect("/orga");
  // Un événement vitrine/démo n'a pas de sens à éditer par ce canal — voir
  // supabase/migrations/20260722120000_evenements_demo.sql.
  if (event.est_demo) redirect("/orga");

  const description = String(formData.get("description") || "").trim();
  const date_debut = String(formData.get("date_debut") || "");
  const heure = String(formData.get("heure") || "") || null;

  if (!date_debut) {
    redirect(`/orga/evenements/${eventId}/modifier?erreur=champs`);
  }

  const categories = parserCategories(formData);
  const imagesConservees = parserImagesConservees(formData);

  // Images actuelles en base, pour savoir lesquelles nettoyer du Storage
  // une fois l'écriture DB réussie.
  const { data: imagesActuelles } = await supabaseAdmin
    .from("event_images")
    .select("url")
    .eq("event_id", eventId);
  const urlsSupprimees = (imagesActuelles ?? [])
    .map((i) => i.url)
    .filter((u) => !imagesConservees.includes(u));

  const fichiersNouveaux = formData
    .getAll("images_nouvelles")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, Math.max(0, MAX_IMAGES - imagesConservees.length));

  const urlsNouvelles: string[] = [];
  let echecUpload = false;
  for (const fichier of fichiersNouveaux) {
    try {
      urlsNouvelles.push(await uploaderImageEvenement(fichier));
    } catch (e) {
      console.error("[modifier] échec upload image :", (e as Error).message);
      echecUpload = true;
      break;
    }
  }
  if (echecUpload) redirect(`/orga/evenements/${eventId}/modifier?erreur=affiche`);

  const imagesFinales = [...imagesConservees, ...urlsNouvelles].slice(0, MAX_IMAGES);

  const typePrincipale = String(formData.get("image_principale_type") || "");
  const valeurPrincipale = String(formData.get("image_principale_valeur") || "");
  let indexPrincipale = 0;
  if (typePrincipale === "existante") {
    const i = imagesConservees.indexOf(valeurPrincipale);
    indexPrincipale = i >= 0 ? i : 0;
  } else if (typePrincipale === "nouvelle") {
    const i = Number(valeurPrincipale);
    indexPrincipale =
      Number.isInteger(i) && i >= 0 && i < urlsNouvelles.length
        ? imagesConservees.length + i
        : 0;
  }
  const affiche_url = imagesFinales[indexPrincipale] ?? null;

  const dateChangee = date_debut !== event.date_debut;

  const { error } = await supabaseAdmin
    .from("events")
    .update({ description: description || null, date_debut, heure, affiche_url })
    .eq("id", eventId);
  if (error) throw new Error(`Modification impossible : ${error.message}`);

  // Catégories et images : remplacement intégral (delete puis insert)
  // plutôt qu'une diffusion ligne à ligne — plus simple et largement
  // suffisant vu le volume (3 catégories, 4 images maximum).
  await supabaseAdmin.from("event_categories").delete().eq("event_id", eventId);
  if (categories.length > 0) {
    const { error: eCat } = await supabaseAdmin.from("event_categories").insert(
      categories.map((categorie, i) => ({ event_id: eventId, categorie, ordre: i }))
    );
    if (eCat) throw new Error(`Enregistrement des catégories impossible : ${eCat.message}`);
  }

  await supabaseAdmin.from("event_images").delete().eq("event_id", eventId);
  if (imagesFinales.length > 0) {
    const { error: eImg } = await supabaseAdmin.from("event_images").insert(
      imagesFinales.map((url, i) => ({ event_id: eventId, url, principale: i === indexPrincipale, ordre: i }))
    );
    if (eImg) throw new Error(`Enregistrement des images impossible : ${eImg.message}`);
  }

  // Nettoyage Storage des images retirées — best-effort, après l'écriture
  // DB réussie (ne doit jamais faire échouer l'édition).
  for (const url of urlsSupprimees) {
    await supprimerImageEvenement(url);
  }

  // Notification acheteurs — best-effort, ne fait jamais échouer l'édition.
  if (dateChangee) {
    try {
      const { data: commandes } = await supabaseAdmin
        .from("orders")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("statut", "paye");
      const destinataires = Array.from(new Set((commandes ?? []).map((c) => c.user_id)));
      const origine = process.env.NEXT_PUBLIC_SITE_URL ?? "https://xwezanevent.vercel.app";
      const lienEvenement = `${origine}/evenement/${event.slug}`;

      for (const userId of destinataires) {
        try {
          const destinataire = await emailUtilisateur(userId);
          if (!destinataire) continue;
          const { subject, html } = emailEvenementDateModifiee({
            titre: event.titre,
            dateAffichee: formatDateLongue(date_debut),
            lienEvenement,
            paysCode: event.pays_code,
          });
          await envoyerEmail({ to: destinataire, subject, html });
        } catch (e) {
          console.error("[modifier] échec notification acheteur :", (e as Error).message);
        }
      }
    } catch (e) {
      console.error("[modifier] échec récupération des acheteurs à notifier :", (e as Error).message);
    }
  }

  revalidatePath("/orga");
  revalidatePath(`/evenement/${event.slug}`);
  redirect("/orga?modifie=1");
}
