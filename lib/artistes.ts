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

/* ---------- Artistes d'un événement (lot 2, design/ARTISTES.md) ---------- */

export const MAX_ARTISTES_EVENEMENT = 10;

/** Résultat de recherche du sélecteur d'artistes. `gere` : rattachement direct, sinon « proposé ». */
export interface ArtisteTrouve {
  id: string;
  nom: string;
  photo: string | null;
  statut: StatutArtiste;
  gere: boolean;
}

/**
 * Recherche pour le sélecteur : les artistes que le compte gère (sauf
 * refusés), puis les artistes validés des autres. Un artiste en validation
 * d'un autre compte reste invisible. Requête vide : seulement ceux qu'il gère.
 */
export async function rechercherArtistes(userId: string, q: string): Promise<ArtisteTrouve[]> {
  const terme = q.trim().slice(0, NOM_SCENE_MAX);
  // Recherche partielle ; % et _ saisis restent des caractères ordinaires.
  const motif = `%${terme.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const vers = (a: Pick<Artiste, "id" | "nom_scene" | "photo_url" | "statut" | "cree_par" | "label_id" | "compte_id">): ArtisteTrouve => ({
    id: a.id,
    nom: a.nom_scene,
    photo: a.statut === "valide" ? a.photo_url : null,
    statut: a.statut,
    gere: gere(a, userId),
  });
  const geres = (await artistesGeres(userId)).filter((a) => a.statut !== "refuse" && (!terme || a.nom_scene.toLowerCase().includes(terme.toLowerCase())));
  if (!terme) return geres.slice(0, 8).map(vers);
  const { data, error } = await supabaseAdmin
    .from("artistes")
    .select("id, nom_scene, photo_url, statut, cree_par, label_id, compte_id")
    .eq("statut", "valide")
    .ilike("nom_scene", motif)
    .order("nom_scene", { ascending: true })
    .limit(8);
  if (error) console.error("[artistes] recherche :", error.message);
  const idsGeres = new Set(geres.map((a) => a.id));
  const autres = ((data ?? []) as Artiste[]).filter((a) => !idsGeres.has(a.id));
  return [...geres, ...autres].slice(0, 8).map(vers);
}

/** Choix envoyé par le formulaire d'événement (champ caché « artistes »). */
export type ChoixArtiste = { id: string } | { nouveau: { nom: string; type: TypeDemande; whatsapp: string } };

/** Rattachements prêts à enregistrer, validés avant toute écriture. */
export type PlanArtistes = ({ id: string; gere: boolean } | { nouveau: { nom: string; type: TypeDemande; whatsapp: string } })[];

/**
 * Lit et valide les artistes choisis, sans rien écrire : un refus ne doit
 * laisser ni événement ni artiste orphelin. Les règles de la demande d'un
 * nouvel artiste sont celles de creerArtiste (app/(orga)/orga/artistes/actions.ts).
 * Un artiste devenu indisponible (refusé, introuvable) est signalé, jamais
 * écarté en silence (leçon de BUGS_REFONTE n°5).
 */
export async function preparerArtistes(brut: unknown, userId: string, verifie: boolean): Promise<{ plan: PlanArtistes } | { erreur: string }> {
  let choix: unknown;
  try {
    choix = JSON.parse(String(brut ?? "[]"));
  } catch {
    return { erreur: "artistes" };
  }
  if (!Array.isArray(choix) || choix.length > MAX_ARTISTES_EVENEMENT) return { erreur: "artistes" };

  const ids: string[] = [];
  const plan: PlanArtistes = [];
  let autoProduits = 0;
  for (const c of choix as Record<string, unknown>[]) {
    if (c && typeof c.id === "string") {
      if (ids.includes(c.id)) continue;
      ids.push(c.id);
      plan.push({ id: c.id, gere: false });
      continue;
    }
    const n = (c?.nouveau ?? null) as Record<string, unknown> | null;
    if (!n) return { erreur: "artistes" };
    const nom = String(n.nom ?? "").trim();
    const type = n.type;
    const whatsapp = String(n.whatsapp ?? "").trim();
    if (!nom || nom.length > NOM_SCENE_MAX) return { erreur: "artiste_nom" };
    if (type !== "label" && type !== "auto_produit") return { erreur: "artistes" };
    if (!verifie && (!/\d{6,}/.test(whatsapp.replace(/\D/g, "")) || whatsapp.length > WHATSAPP_MAX)) return { erreur: "artiste_whatsapp" };
    if (type === "auto_produit") autoProduits++;
    plan.push({ nouveau: { nom, type, whatsapp: verifie ? "" : whatsapp } });
  }

  if (autoProduits > 1) return { erreur: "artiste_moi_meme" };
  if (autoProduits === 1) {
    const { data: dejaPerso } = await supabaseAdmin.from("artistes").select("id").eq("compte_id", userId).maybeSingle();
    if (dejaPerso) return { erreur: "artiste_moi_meme" };
  }

  if (ids.length) {
    const { data, error } = await supabaseAdmin.from("artistes").select("id, statut, cree_par, label_id, compte_id").in("id", ids);
    if (error) return { erreur: "artistes" };
    const lus = new Map(((data ?? []) as Artiste[]).map((a) => [a.id, a]));
    for (const p of plan) {
      if (!("id" in p)) continue;
      const a = lus.get(p.id);
      if (!a || a.statut === "refuse") return { erreur: "artiste_indisponible" };
      p.gere = gere(a, userId);
      // Un artiste en validation n'est visible que de ceux qui le gèrent.
      if (!p.gere && a.statut !== "valide") return { erreur: "artiste_indisponible" };
    }
  }
  return { plan };
}

/**
 * Enregistre les rattachements d'un événement créé : crée d'abord les
 * nouveaux artistes demandés (en validation, ou validés pour un compte
 * vérifié), puis les lignes evenement_artistes dans l'ordre choisi. Artiste
 * géré par le compte : « accepte » ; sinon « propose », invisible jusqu'à
 * l'accord de son label, de son compte ou de l'admin.
 * Renvoie les artistes publiés directement (compte vérifié), pour l'e-mail
 * de surveillance.
 */
export async function enregistrerArtistes(eventId: string, plan: PlanArtistes, userId: string, verifie: boolean): Promise<{ nom: string; slug: string }[]> {
  const maintenant = new Date().toISOString();
  const publies: { nom: string; slug: string }[] = [];
  const lignes: Record<string, unknown>[] = [];
  for (let ordre = 0; ordre < plan.length; ordre++) {
    const p = plan[ordre];
    let artisteId: string;
    let accepte: boolean;
    if ("nouveau" in p) {
      const { nom, type, whatsapp } = p.nouveau;
      const { data: cree, error } = await supabaseAdmin
        .from("artistes")
        .insert({
          slug: await slugLibre(nom),
          nom_scene: nom,
          type_demande: type,
          label_id: type === "label" ? userId : null,
          compte_id: type === "auto_produit" ? userId : null,
          cree_par: userId,
          whatsapp_contact: verifie ? null : whatsapp,
          statut: verifie ? "valide" : "en_validation",
          soumis_le: maintenant,
          valide_le: verifie ? maintenant : null,
        })
        .select("id, slug")
        .single();
      if (error || !cree) throw new Error(`Création de l'artiste impossible : ${error?.message}`);
      if (verifie) publies.push({ nom, slug: cree.slug });
      artisteId = cree.id;
      accepte = true;
    } else {
      artisteId = p.id;
      accepte = p.gere;
    }
    lignes.push({
      event_id: eventId,
      artiste_id: artisteId,
      ordre,
      statut: accepte ? "accepte" : "propose",
      propose_par: userId,
      accepte_par: accepte ? userId : null,
      accepte_le: accepte ? maintenant : null,
    });
  }
  if (lignes.length) {
    const { error } = await supabaseAdmin.from("evenement_artistes").insert(lignes);
    if (error) throw new Error(`Rattachement des artistes impossible : ${error.message}`);
  }
  return publies;
}
