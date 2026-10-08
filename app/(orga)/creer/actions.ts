"use server";

import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { uploaderImageEvenement } from "@/lib/images-evenement";
import { MAX_IMAGES } from "@/lib/affiche";
import { MAX_CATEGORIES } from "@/lib/categories";
import { aujourdhuiPortoNovo } from "@/lib/date";
import { finDeVenteDepuisDate } from "@/lib/vente";
import { headers } from "next/headers";
import {
  enregistrerArtistes,
  estVerifie,
  notifierPropositions,
  preparerArtistes,
  rechercherArtistes,
  surveillerArtistesPublies,
  surveillerEvenementPublie,
  type ArtisteTrouve,
} from "@/lib/artistes";
import { journaliserAction } from "@/lib/journal";
import { notifierNouvelleDate } from "@/lib/nouvelle-date";

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const date_fin = String(formData.get("date_fin") || "") || null;
  const heure = String(formData.get("heure") || "") || null;
  const lieu = String(formData.get("lieu") || "").trim();
  const ville = String(formData.get("ville") || "").trim();
  const pays_code = String(formData.get("pays_code") || "").trim();

  // Validations sans effet de bord AVANT l'envoi des images : un refus ne
  // doit pas laisser de fichiers orphelins dans le stockage.
  if (
    !titre ||
    !DATE_ISO.test(date_debut) ||
    (date_fin !== null && !DATE_ISO.test(date_fin)) ||
    !lieu ||
    !ville ||
    !pays_code
  ) {
    redirect("/creer?erreur=champs");
  }
  // Jamais confiance au client seul (checkbox + min sur l'input côté
  // navigateur) : revalidé ici, comme la contrainte CHECK en base.
  if (date_fin && date_fin < date_debut) {
    redirect("/creer?erreur=dates");
  }
  // Pas d'événement dans le passé (design/BUGS_REFONTE.md, amélioration A1) :
  // la date conditionne le J+3 des reversements, la règle est donc tenue ici
  // et pas seulement par le `min` du navigateur.
  if (date_debut < aujourdhuiPortoNovo()) {
    redirect("/creer?erreur=date_passee");
  }

  // Artistes à l'affiche (design/ARTISTES.md, lot 2) : validés ici, avant
  // tout envoi d'image ou écriture, comme les champs ci-dessus.
  const verifie = await estVerifie(user.id);
  const artistes = await preparerArtistes(formData.get("artistes"), user.id, verifie);
  if ("erreur" in artistes) redirect(`/creer?erreur=${artistes.erreur}`);

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

  // Le sélecteur ne propose que les pays actifs, mais le formulaire n'est
  // jamais source de vérité : on revalide contre la table `pays` (voir
  // supabase/migrations/20260805120000_multi_pays_evenements.sql) plutôt
  // que d'accepter n'importe quelle valeur postée.
  const { data: paysValide } = await supabaseAdmin
    .from("pays")
    .select("code, taux_commission_defaut")
    .eq("code", pays_code)
    .eq("actif", true)
    .maybeSingle();
  if (!paysValide) {
    redirect("/creer?erreur=pays");
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
      pays_code,
      // Taux du pays au moment de la création, pas le DEFAULT de la colonne
      // (qui ne reflète que le Bénin) — voir
      // supabase/migrations/20260809120000_taux_commission_defaut_par_pays.sql.
      taux_commission: paysValide!.taux_commission_defaut,
      ville,
      lieu,
      date_debut,
      date_fin,
      heure,
      affiche_url,
      // Statut TOUJOURS forcé côté serveur, jamais lu depuis le formulaire :
      // en validation à la création. Seuls passent ensuite à 'publie' la
      // validation admin (/api/admin/events/[id]/valider) et, pour un compte
      // vérifié (comptes_verifies), la publication directe en fin d'action.
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
      // Fin du jour choisi à Porto-Novo, jamais au fuseau du serveur (BUGS_REFONTE n°10).
      vente_jusqua: t.venteJusqua && /^\d{4}-\d{2}-\d{2}$/.test(t.venteJusqua) ? finDeVenteDepuisDate(t.venteJusqua) : null,
    }));

  if (rows.length > 0) {
    const { error: e2 } = await supabaseAdmin.from("ticket_types").insert(rows);
    if (e2) throw new Error(`Création billets impossible : ${e2.message}`);
  }

  const { publies, proposes } = await enregistrerArtistes(ev.id, artistes.plan, user.id, verifie);
  // Compte vérifié : ses nouveaux artistes sont en ligne sans validation,
  // l'équipe reçoit l'e-mail de surveillance (comme depuis /orga/artistes).
  await surveillerArtistesPublies(publies, user, origine());
  // Artistes d'autres comptes : leur label ou leur compte est prévenu, avec un lien direct.
  await notifierPropositions(ev.id, proposes, user, origine());

  // Compte vérifié (design/ARTISTES.md) : publié sans validation admin, par la
  // même transition que /api/admin/events/[id]/valider (en_validation →
  // publie), une fois billets, images et artistes enregistrés : la page n'est
  // jamais en ligne incomplète. En cas d'échec, l'événement reste en
  // validation et suit le circuit habituel (l'écran de confirmation lit le
  // statut réel). L'équipe reçoit l'e-mail de surveillance, sans blocage.
  if (verifie) {
    const { data: publie, error: erreurPublication } = await supabaseAdmin
      .from("events")
      .update({ statut: "publie" })
      .eq("id", ev.id)
      .eq("statut", "en_validation")
      .select("id")
      .maybeSingle();
    if (erreurPublication) console.error("[creer] publication directe impossible :", erreurPublication.message);
    if (publie) {
      await journaliserAction(user.id, "organisateur", "publication directe (compte vérifié)", { event_id: ev.id, titre });
      await surveillerEvenementPublie({ titre, slug: ev.slug }, user, origine());
      // « Nouvelle date » aux abonnés des artistes de l'affiche (lot 3).
      await notifierNouvelleDate(ev.id, origine());
      revalidatePath("/");
      revalidatePath("/evenements");
    }
  }

  // Rafraîchit le tableau de bord organisateur, où l'événement apparaît
  // immédiatement (« En validation », ou « En vente » pour un compte vérifié).
  revalidatePath("/orga");

  // Écran de confirmation (refonte V2) : « Envoyé pour validation », ou
  // « Publié » pour un compte vérifié, au lieu d'un retour muet sur /orga
  // (design/BUGS_REFONTE.md n°1). La page revérifie qu'il en est bien l'auteur.
  redirect(`/creer?envoye=${ev.id}`);
}

/** Recherche du sélecteur d'artistes (components/v2/orga/creer/Artistes.tsx). */
export async function chercherArtistes(q: string): Promise<ArtisteTrouve[]> {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  return rechercherArtistes(user.id, String(q ?? ""));
}
