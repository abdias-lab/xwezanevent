import "server-only";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TAILLE_AFFICHE_MAX, TYPES_AFFICHE_AUTORISES } from "@/lib/affiche";

/**
 * Valide et envoie une image dans le bucket Storage "affiches" (partagé par
 * la création et l'édition d'événement). Le nom d'origine n'est jamais
 * utilisé : le fichier est renommé avec un UUID pour éviter
 * collisions/traversal et ne pas exposer le nom du client.
 */
export async function uploaderImageEvenement(fichier: File): Promise<string> {
  const extension = TYPES_AFFICHE_AUTORISES[fichier.type];
  if (!extension) {
    throw new Error("Format d'image non supporté (JPG, PNG ou WebP uniquement).");
  }
  if (fichier.size > TAILLE_AFFICHE_MAX) {
    throw new Error("Une image ne doit pas dépasser 5 Mo.");
  }

  const nomFichier = `${randomUUID()}.${extension}`;
  const octets = new Uint8Array(await fichier.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("affiches")
    .upload(nomFichier, octets, { contentType: fichier.type, upsert: false });
  if (error) {
    throw new Error(`Envoi de l'image impossible : ${error.message}`);
  }

  const { data } = supabaseAdmin.storage.from("affiches").getPublicUrl(nomFichier);
  return data.publicUrl;
}

/**
 * Extrait la clé Storage (nom de fichier) depuis une URL publique du bucket
 * "affiches", pour permettre sa suppression lors d'une édition qui retire
 * une image. Retourne null si l'URL ne correspond pas à ce bucket — dans ce
 * cas on ne tente pas de supprimer.
 */
function cleStorageDepuisUrl(url: string): string | null {
  const marqueur = "/affiches/";
  const i = url.indexOf(marqueur);
  if (i === -1) return null;
  return url.slice(i + marqueur.length);
}

/**
 * Supprime une image du bucket "affiches". Best-effort, ne lève jamais :
 * une image déjà absente ou une URL hors bucket ne doit jamais faire
 * échouer l'édition d'un événement qui en profite pour nettoyer.
 */
export async function supprimerImageEvenement(url: string): Promise<void> {
  const cle = cleStorageDepuisUrl(url);
  if (!cle) return;
  const { error } = await supabaseAdmin.storage.from("affiches").remove([cle]);
  if (error) {
    console.error("[images-evenement] échec suppression Storage :", error.message);
  }
}
