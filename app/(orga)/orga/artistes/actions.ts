"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { uploaderImageEvenement, supprimerImageEvenement } from "@/lib/images-evenement";
import { envoyerEmail } from "@/lib/email";
import { ADRESSE_EQUIPE, emailPublicationVerifiee } from "@/lib/emails/surveillance";
import { notifierNouvelleDate } from "@/lib/nouvelle-date";
import { BIO_MAX, COLONNES_ARTISTE, NOM_SCENE_MAX, WHATSAPP_MAX, deciderProposition, estVerifie, gere, lireLiens, slugLibre, type Artiste } from "@/lib/artistes";

export type EtatFormulaireArtiste = { erreur: string } | null;

function origine(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function utilisateur() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/artistes");
  return user;
}

/** Photo envoyée (déjà compressée dans le navigateur), ou null si aucune. */
function lirePhoto(formData: FormData): File | null {
  const f = formData.get("photo");
  return f instanceof File && f.size > 0 ? f : null;
}

/** Nom public du compte, pour l'e-mail de surveillance. */
async function nomCompte(userId: string, email: string | undefined) {
  const { data } = await supabaseAdmin.from("profiles").select("nom, nom_public").eq("id", userId).maybeSingle();
  return data?.nom_public || data?.nom || email || "Compte vérifié";
}

/**
 * Demande d'un nouvel artiste (design/ARTISTES.md). Compte non vérifié :
 * artiste « en_validation », invisible du public, WhatsApp obligatoire (canal
 * de l'équipe pour les pièces). Compte vérifié : publié tout de suite, et
 * l'équipe reçoit un e-mail de surveillance. Un compte « visiteur » passe
 * « organisateur », comme à la création d'un événement.
 */
export async function creerArtiste(_etat: EtatFormulaireArtiste, formData: FormData): Promise<EtatFormulaireArtiste> {
  const user = await utilisateur();
  const verifie = await estVerifie(user.id);

  const type = String(formData.get("type") ?? "");
  if (type !== "label" && type !== "auto_produit") return { erreur: "Choisis pour qui est cette page." };
  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom || nom.length > NOM_SCENE_MAX) return { erreur: "Indique le nom de scène (80 caractères au plus)." };
  const bio = String(formData.get("bio") ?? "").trim();
  if (bio.length > BIO_MAX) return { erreur: `La bio ne doit pas dépasser ${BIO_MAX} caractères.` };
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  if (!verifie && (!/\d{6,}/.test(whatsapp.replace(/\D/g, "")) || whatsapp.length > WHATSAPP_MAX)) {
    return { erreur: "Indique un numéro WhatsApp valide, avec l'indicatif du pays." };
  }
  const lus = lireLiens(formData);
  if ("invalide" in lus) return { erreur: `L'adresse ${lus.invalide} n'est pas valide.` };

  if (type === "auto_produit") {
    const { data: dejaPerso } = await supabaseAdmin.from("artistes").select("id").eq("compte_id", user.id).maybeSingle();
    if (dejaPerso) return { erreur: "Tu as déjà ta page artiste. Choisis « Un artiste de mon label »." };
  }

  let photoUrl: string | null = null;
  const photo = lirePhoto(formData);
  if (photo) {
    try {
      photoUrl = await uploaderImageEvenement(photo);
    } catch (e) {
      return { erreur: (e as Error).message };
    }
  }

  const maintenant = new Date().toISOString();
  const { data: cree, error } = await supabaseAdmin
    .from("artistes")
    .insert({
      slug: await slugLibre(nom),
      nom_scene: nom,
      bio: bio || null,
      photo_url: photoUrl,
      liens: lus.liens,
      type_demande: type,
      label_id: type === "label" ? user.id : null,
      compte_id: type === "auto_produit" ? user.id : null,
      cree_par: user.id,
      whatsapp_contact: verifie ? null : whatsapp,
      statut: verifie ? "valide" : "en_validation",
      soumis_le: maintenant,
      valide_le: verifie ? maintenant : null,
    })
    .select("id, slug")
    .single();
  if (error || !cree) {
    console.error("[orga/artistes] création :", error?.message);
    if (photoUrl) await supprimerImageEvenement(photoUrl);
    return { erreur: "Enregistrement impossible, réessaie." };
  }

  // Comme à la création d'un événement : un compte « visiteur » devient organisateur.
  await supabaseAdmin.from("profiles").update({ role: "organisateur" }).eq("id", user.id).eq("role", "visiteur");

  if (verifie) {
    const { subject, html } = emailPublicationVerifiee({ quoi: "artiste", titre: nom, auteur: await nomCompte(user.id, user.email), lien: `${origine()}/artiste/${cree.slug}` });
    await envoyerEmail({ to: ADRESSE_EQUIPE, subject, html }).catch((e) => console.error("[orga/artistes] e-mail de surveillance :", e));
  }

  revalidatePath("/orga/artistes");
  redirect(`/orga/artistes?${verifie ? "publie" : "envoye"}=1`);
}

/**
 * Modification d'un artiste géré par le compte. Bio, photo, réseaux : libres.
 * Nom de scène : direct si le compte est vérifié ou si la page n'est pas en
 * ligne ; sinon nom_scene_demande, en vérification, l'ancien nom reste
 * affiché. Une demande refusée repasse en vérification (ou en ligne pour un
 * compte devenu vérifié). Le slug ne change jamais : les liens restent valides.
 */
export async function modifierArtiste(_etat: EtatFormulaireArtiste, formData: FormData): Promise<EtatFormulaireArtiste> {
  const user = await utilisateur();
  const id = String(formData.get("id") ?? "");
  const { data } = await supabaseAdmin.from("artistes").select(COLONNES_ARTISTE).eq("id", id).maybeSingle();
  const artiste = data as Artiste | null;
  if (!artiste || !gere(artiste, user.id)) return { erreur: "Artiste introuvable." };
  const verifie = await estVerifie(user.id);

  const nom = String(formData.get("nom") ?? "").trim();
  if (!nom || nom.length > NOM_SCENE_MAX) return { erreur: "Indique le nom de scène (80 caractères au plus)." };
  const bio = String(formData.get("bio") ?? "").trim();
  if (bio.length > BIO_MAX) return { erreur: `La bio ne doit pas dépasser ${BIO_MAX} caractères.` };
  const lus = lireLiens(formData);
  if ("invalide" in lus) return { erreur: `L'adresse ${lus.invalide} n'est pas valide.` };

  const maj: Record<string, unknown> = { bio: bio || null, liens: lus.liens };

  const nouvellePhoto = lirePhoto(formData);
  const retirer = formData.get("photo_retirer") === "1";
  if (nouvellePhoto) {
    try {
      maj.photo_url = await uploaderImageEvenement(nouvellePhoto);
    } catch (e) {
      return { erreur: (e as Error).message };
    }
  } else if (retirer) {
    maj.photo_url = null;
  }

  const enLigne = artiste.statut === "valide";
  if (nom !== artiste.nom_scene) {
    if (verifie || !enLigne) {
      maj.nom_scene = nom;
      maj.nom_scene_demande = null;
    } else {
      maj.nom_scene_demande = nom;
    }
  } else if (artiste.nom_scene_demande) {
    // Retour au nom actuel : la demande de changement est abandonnée.
    maj.nom_scene_demande = null;
  }

  if (artiste.statut === "refuse") {
    Object.assign(maj, verifie ? { statut: "valide", valide_le: new Date().toISOString() } : { statut: "en_validation" }, {
      motif_refus: null,
      soumis_le: new Date().toISOString(),
    });
  }

  const { error } = await supabaseAdmin.from("artistes").update(maj).eq("id", artiste.id);
  if (error) {
    console.error("[orga/artistes] modification :", error.message);
    if (nouvellePhoto && typeof maj.photo_url === "string") await supprimerImageEvenement(maj.photo_url);
    return { erreur: "Enregistrement impossible, réessaie." };
  }
  // Ancienne photo remplacée ou retirée : libérée du stockage.
  if ((nouvellePhoto || retirer) && artiste.photo_url) await supprimerImageEvenement(artiste.photo_url);

  revalidatePath("/orga/artistes");
  revalidatePath(`/artiste/${artiste.slug}`);
  redirect("/orga/artistes?maj=1");
}

/**
 * Accepter ou refuser une proposition de rattachement (design/ARTISTES.md,
 * lot 2), depuis la section « Propositions » de Mes artistes. Réservé à qui
 * gère l'artiste (label, compte de l'artiste, créateur de la page) ; la
 * décision n'écrase jamais une décision déjà prise (deciderProposition).
 */
export async function deciderPropositionOrga(formData: FormData) {
  const user = await utilisateur();
  const [eventId, artisteId] = String(formData.get("cle") ?? "").split(".");
  const decision = formData.get("decision");
  if (!eventId || !artisteId || (decision !== "accepter" && decision !== "refuser")) redirect("/orga/artistes");

  const { data } = await supabaseAdmin.from("artistes").select("cree_par, label_id, compte_id").eq("id", artisteId).maybeSingle();
  if (!data || !gere(data, user.id)) redirect("/orga/artistes");

  const fait = await deciderProposition(eventId, artisteId, decision, user.id);
  if (!fait) redirect("/orga/artistes?decision=deja");
  // Rattachement accepté : « nouvelle date » aux abonnés de l'artiste si l'événement
  // est en ligne, à venir et en vente (lot 3).
  if (decision === "accepter") await notifierNouvelleDate(eventId, origine(), [artisteId]);
  revalidatePath("/orga/artistes");
  if (fait.evenement) revalidatePath(`/evenement/${fait.evenement}`);
  if (fait.artiste) revalidatePath(`/artiste/${fait.artiste}`);
  redirect(`/orga/artistes?decision=${decision === "accepter" ? "acceptee" : "refusee"}`);
}
