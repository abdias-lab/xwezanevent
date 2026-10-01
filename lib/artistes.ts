import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Artistes et comptes vérifiés (design/ARTISTES.md ; schéma :
 * 20261001120000_artistes_abonnements.sql). Lecture et écriture via
 * service_role uniquement : les tables n'ont aucun droit d'écriture client.
 */

export type StatutArtiste = "en_validation" | "valide" | "refuse";
export type TypeDemande = "label" | "auto_produit";
export type CleReseau = "instagram" | "facebook" | "tiktok" | "youtube" | "spotify" | "audiomack" | "boomplay" | "site";

export interface Artiste {
  id: string;
  slug: string;
  nom_scene: string;
  nom_scene_demande: string | null;
  bio: string | null;
  photo_url: string | null;
  liens: Partial<Record<CleReseau, string>>;
  type_demande: TypeDemande;
  label_id: string | null;
  compte_id: string | null;
  cree_par: string | null;
  statut: StatutArtiste;
  motif_refus: string | null;
}

export const COLONNES_ARTISTE =
  "id, slug, nom_scene, nom_scene_demande, bio, photo_url, liens, type_demande, label_id, compte_id, cree_par, statut, motif_refus";

export const NOM_SCENE_MAX = 80;
export const BIO_MAX = 2000;
export const WHATSAPP_MAX = 30;

/** Réseaux acceptés et domaines autorisés ; « site » accepte toute adresse http(s). */
export const RESEAUX: { cle: CleReseau; libelle: string; exemple: string; domaines: string[] | null }[] = [
  { cle: "instagram", libelle: "Instagram", exemple: "https://instagram.com/…", domaines: ["instagram.com"] },
  { cle: "facebook", libelle: "Facebook", exemple: "https://facebook.com/…", domaines: ["facebook.com", "fb.com"] },
  { cle: "tiktok", libelle: "TikTok", exemple: "https://tiktok.com/@…", domaines: ["tiktok.com"] },
  { cle: "youtube", libelle: "YouTube", exemple: "https://youtube.com/@…", domaines: ["youtube.com", "youtu.be"] },
  { cle: "spotify", libelle: "Spotify", exemple: "https://open.spotify.com/artist/…", domaines: ["spotify.com"] },
  { cle: "audiomack", libelle: "Audiomack", exemple: "https://audiomack.com/…", domaines: ["audiomack.com"] },
  { cle: "boomplay", libelle: "Boomplay", exemple: "https://boomplay.com/artists/…", domaines: ["boomplay.com", "boomplaymusic.com"] },
  { cle: "site", libelle: "Site web", exemple: "https://…", domaines: null },
];

/**
 * Lit les réseaux saisis (champs « lien_<cle> ») : https:// ajouté si
 * absent, http(s) seulement, domaine vérifié. Renvoie les liens propres, ou
 * le libellé du premier réseau invalide.
 */
export function lireLiens(formData: FormData): { liens: Partial<Record<CleReseau, string>> } | { invalide: string } {
  const liens: Partial<Record<CleReseau, string>> = {};
  for (const r of RESEAUX) {
    const brut = String(formData.get(`lien_${r.cle}`) ?? "").trim();
    if (!brut) continue;
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(brut) ? brut : `https://${brut}`);
    } catch {
      return { invalide: r.libelle };
    }
    const hote = url.hostname.toLowerCase().replace(/^www\./, "");
    const domaineOk = r.domaines === null ? hote.includes(".") : r.domaines.some((d) => hote === d || hote.endsWith(`.${d}`));
    if (!["http:", "https:"].includes(url.protocol) || !domaineOk || url.href.length > 300) return { invalide: r.libelle };
    liens[r.cle] = url.href;
  }
  return { liens };
}

/** Le compte est-il vérifié (comptes_verifies) ? */
export async function estVerifie(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("comptes_verifies").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Artistes que le compte gère : qu'il a créés, de son label, ou son propre compte artiste. */
export async function artistesGeres(userId: string): Promise<Artiste[]> {
  const { data, error } = await supabaseAdmin
    .from("artistes")
    .select(COLONNES_ARTISTE)
    .or(`cree_par.eq.${userId},label_id.eq.${userId},compte_id.eq.${userId}`)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[artistes] lecture des artistes gérés :", error.message);
    return [];
  }
  return (data ?? []) as Artiste[];
}

export const gere = (a: Pick<Artiste, "cree_par" | "label_id" | "compte_id">, userId: string) =>
  a.cree_par === userId || a.label_id === userId || a.compte_id === userId;

function slugifier(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artiste"
  );
}

/** Slug libre tiré du nom de scène : « zeynab-habib », sinon « zeynab-habib-2 », etc. */
export async function slugLibre(nom: string): Promise<string> {
  const base = slugifier(nom).slice(0, 60).replace(/-+$/, "");
  const { data } = await supabaseAdmin.from("artistes").select("slug").like("slug", `${base}%`);
  const pris = new Set((data ?? []).map((r) => r.slug as string));
  if (!pris.has(base)) return base;
  for (let n = 2; ; n++) if (!pris.has(`${base}-${n}`)) return `${base}-${n}`;
}
