"use server";

import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { uploaderImageEvenement } from "@/lib/images-evenement";
import { MAX_IMAGES } from "@/lib/affiche";
import { MAX_CATEGORIES } from "@/lib/categories";

interface TicketSaisi {
  nom?: string;
  prix?: string | number;
  quantite?: string | number;
  venteJusqua?: string;
}

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

/**
 * Soumet un événement à la modération pour l'organisateur connecté.
 * - Auth requise ; un visiteur est promu « organisateur » à sa 1re soumission.
 * - Écriture via service_role (les policies RLS bloquent l'INSERT direct).
 * - Slug unique généré depuis le titre.
 * - L'événement est créé en statut 'en_validation' : il ne devient visible
 *   publiquement qu'après validation par un admin (/api/admin/events/[id]/valider).
 */
export async function publierEvenement(formData: FormData) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/creer");

  const titre = String(formData.get("titre") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categories = parserCategories(formData);
  const date_debut = String(formData.get("date_debut") || "");
  const heure = String(formData.get("heure") || "") || null;
  const lieu = String(formData.get("lieu") || "").trim();
  const ville = String(formData.get("ville") || "").trim();

  const fichiersImages = formData
    .getAll("images_nouvelles")
    .filter((f): f is File => f instanceof File && f.size > 0)
    .slice(0, MAX_IMAGES);

  const urlsImages: string[] = [];
  let echecUpload = false;
  for (const fichier of fichiersImages) {
    try {
      urlsImages.push(await uploaderImageEvenement(fichier));
    } catch (e) {
      console.error("[creer] échec upload image :", (e as Error).message);
      echecUpload = true;
      break;
    }
  }
  if (echecUpload) redirect("/creer?erreur=affiche");

  const indexPrincipaleBrut = Number(formData.get("image_principale_valeur"));
  const indexPrincipale =
    formData.get("image_principale_type") === "nouvelle" &&
    Number.isInteger(indexPrincipaleBrut) &&
    indexPrincipaleBrut >= 0 &&
    indexPrincipaleBrut < urlsImages.length
      ? indexPrincipaleBrut
      : 0;
  const affiche_url = urlsImages[indexPrincipale] ?? null;

  let ticketsSaisis: TicketSaisi[] = [];
  try {
    ticketsSaisis = JSON.parse(String(formData.get("tickets") || "[]"));
  } catch {
    ticketsSaisis = [];
  }

  if (!titre || !date_debut || !lieu || !ville) {
    redirect("/creer?erreur=champs");
  }

  // Promotion visiteur -> organisateur
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role === "visiteur") {
    await supabaseAdmin
      .from("profiles")
      .update({ role: "organisateur" })
      .eq("id", user.id);
  }

  // Slug unique
  const base = slugify(titre) || "evenement";
  let slug = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: existant } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existant) break;
    slug = `${base}-${n++}`;
  }

  const { data: ev, error } = await supabaseAdmin
    .from("events")
    .insert({
      organisateur_id: user.id,
      titre,
      slug,
      description: description || null,
      ville,
      lieu,
      date_debut,
      heure,
      affiche_url,
      // Statut TOUJOURS forcé côté serveur, jamais lu depuis le formulaire :
      // la modération admin est obligatoire avant publication (voir
      // /api/admin/events/[id]/valider, seule route habilitée à passer 'publie').
      statut: "en_validation",
    })
    .select("id, slug")
    .single();
  if (error || !ev) {
    throw new Error(`Création événement impossible : ${error?.message}`);
  }

  if (categories.length > 0) {
    const { error: eCat } = await supabaseAdmin.from("event_categories").insert(
      categories.map((categorie, i) => ({ event_id: ev.id, categorie, ordre: i }))
    );
    if (eCat) throw new Error(`Enregistrement des catégories impossible : ${eCat.message}`);
  }

  if (urlsImages.length > 0) {
    const { error: eImg } = await supabaseAdmin.from("event_images").insert(
      urlsImages.map((url, i) => ({ event_id: ev.id, url, principale: i === indexPrincipale, ordre: i }))
    );
    if (eImg) throw new Error(`Enregistrement des images impossible : ${eImg.message}`);
  }

  // Types de billets valides
  const rows = ticketsSaisis
    .filter(
      (t) =>
        t.nom &&
        String(t.nom).trim() &&
        Number(t.prix) >= 0 &&
        Number(t.quantite) > 0
    )
    .map((t) => ({
      event_id: ev.id,
      nom: String(t.nom).trim(),
      prix: Math.round(Number(t.prix)),
      quantite_totale: Math.round(Number(t.quantite)),
      vente_jusqua: t.venteJusqua
        ? new Date(`${t.venteJusqua}T23:59:59`).toISOString()
        : null,
    }));

  if (rows.length > 0) {
    const { error: e2 } = await supabaseAdmin.from("ticket_types").insert(rows);
    if (e2) throw new Error(`Création billets impossible : ${e2.message}`);
  }

  // Rafraîchit le tableau de bord organisateur, où l'événement apparaît
  // immédiatement avec le badge « En validation ».
  revalidatePath("/orga");

  redirect("/orga");
}
