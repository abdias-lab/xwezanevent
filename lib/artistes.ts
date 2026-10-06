import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { envoyerEmail } from "@/lib/email";
import { ADRESSE_EQUIPE, emailPublicationVerifiee } from "@/lib/emails/surveillance";
import { emailUtilisateur } from "@/lib/email";
import { emailPropositionRattachement } from "@/lib/emails/rattachement";
import { formatPlageDates } from "@/lib/date";

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

/** Messages des refus de preparerArtistes (?erreur=), communs à /creer et /modifier. */
export const MESSAGES_ERREUR_ARTISTES: Record<string, string> = {
  artistes: "La liste des artistes n'a pas pu être lue. Rien n'a été enregistré, réessaie.",
  artiste_nom: "Indique le nom de scène de chaque nouvel artiste (80 caractères au plus).",
  artiste_whatsapp: "Indique un numéro WhatsApp valide, avec l'indicatif du pays, pour chaque nouvel artiste.",
  artiste_moi_meme: "Tu as déjà ta page artiste : choisis-la dans la liste au lieu d'en demander une nouvelle.",
  artiste_indisponible: "Un des artistes choisis n'est plus disponible. Vérifie la liste et réessaie.",
};

/**
 * Lit et valide les artistes choisis, sans rien écrire : un refus ne doit
 * laisser ni événement ni artiste orphelin. Les règles de la demande d'un
 * nouvel artiste sont celles de creerArtiste (app/(orga)/orga/artistes/actions.ts).
 * Un artiste devenu indisponible (refusé, introuvable) est signalé, jamais
 * écarté en silence (leçon de BUGS_REFONTE n°5).
 * `dejaRattaches` (modification) : artistes déjà sur l'événement, acceptés
 * tels quels même devenus refusés, pour ne pas bloquer l'enregistrement du
 * reste de l'événement.
 */
export async function preparerArtistes(
  brut: unknown,
  userId: string,
  verifie: boolean,
  dejaRattaches: ReadonlySet<string> = new Set(),
): Promise<{ plan: PlanArtistes } | { erreur: string }> {
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

  const aVerifier = ids.filter((id) => !dejaRattaches.has(id));
  if (aVerifier.length) {
    const { data, error } = await supabaseAdmin.from("artistes").select("id, statut, cree_par, label_id, compte_id").in("id", aVerifier);
    if (error) return { erreur: "artistes" };
    const lus = new Map(((data ?? []) as Artiste[]).map((a) => [a.id, a]));
    for (const p of plan) {
      if (!("id" in p) || dejaRattaches.has(p.id)) continue;
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
 * Enregistre les rattachements d'un événement dans l'ordre choisi :
 * - nouveaux artistes demandés créés d'abord (en validation, ou validés pour
 *   un compte vérifié) ;
 * - artiste ajouté : « accepte » s'il est géré par le compte, sinon
 *   « propose », invisible jusqu'à l'accord de son label, de son compte ou de
 *   l'admin ;
 * - modification (`existants` : artiste_id des lignes en base) : une ligne
 *   conservée garde son statut et son acceptation, seul l'ordre change ; une
 *   ligne retirée de la liste est supprimée.
 * Renvoie les artistes publiés directement (compte vérifié), pour l'e-mail
 * de surveillance, et les artistes nouvellement proposés, à notifier.
 */
export async function enregistrerArtistes(
  eventId: string,
  plan: PlanArtistes,
  userId: string,
  verifie: boolean,
  existants: ReadonlySet<string> = new Set(),
): Promise<{ publies: { nom: string; slug: string }[]; proposes: string[] }> {
  const gardes = new Set(plan.flatMap((p) => ("id" in p && existants.has(p.id) ? [p.id] : [])));
  const retires = Array.from(existants).filter((id) => !gardes.has(id));
  if (retires.length) {
    const { error } = await supabaseAdmin.from("evenement_artistes").delete().eq("event_id", eventId).in("artiste_id", retires);
    if (error) throw new Error(`Retrait des artistes impossible : ${error.message}`);
  }

  const maintenant = new Date().toISOString();
  const publies: { nom: string; slug: string }[] = [];
  const lignes: Record<string, unknown>[] = [];
  for (let ordre = 0; ordre < plan.length; ordre++) {
    const p = plan[ordre];
    if ("id" in p && gardes.has(p.id)) {
      const { error } = await supabaseAdmin.from("evenement_artistes").update({ ordre }).eq("event_id", eventId).eq("artiste_id", p.id);
      if (error) throw new Error(`Ordre des artistes impossible à enregistrer : ${error.message}`);
      continue;
    }
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
  const proposes = lignes.filter((l) => l.statut === "propose").map((l) => l.artiste_id as string);
  return { publies, proposes };
}

/**
 * E-mail de surveillance pour les artistes publiés directement par un compte
 * vérifié depuis le formulaire d'événement (comme depuis /orga/artistes).
 * Best-effort : n'interrompt jamais l'enregistrement.
 */
export async function surveillerArtistesPublies(publies: { nom: string; slug: string }[], user: { id: string; email?: string }, origine: string) {
  if (!publies.length) return;
  const { data: auteur } = await supabaseAdmin.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle();
  for (const a of publies) {
    const { subject, html } = emailPublicationVerifiee({
      quoi: "artiste",
      titre: a.nom,
      auteur: auteur?.nom_public || auteur?.nom || user.email || "Compte vérifié",
      lien: `${origine}/artiste/${a.slug}`,
    });
    await envoyerEmail({ to: ADRESSE_EQUIPE, subject, html }).catch((e) => console.error("[artistes] e-mail de surveillance :", e));
  }
}

/* ---------- Rattachements proposés : notification, décision (lot 2) ---------- */

export type StatutRattachement = "accepte" | "propose" | "refuse";

/** Destinataires d'une proposition : le label et le compte de l'artiste, à défaut son créateur. */
function decideurs(a: Pick<Artiste, "label_id" | "compte_id" | "cree_par">): string[] {
  const ids = [a.label_id, a.compte_id].filter((x): x is string => !!x);
  if (!ids.length && a.cree_par) ids.push(a.cree_par);
  return Array.from(new Set(ids));
}

/** Clé d'une proposition dans les liens (?proposition=) et les ancres de Mes artistes. */
export const cleProposition = (eventId: string, artisteId: string) => `${eventId}.${artisteId}`;

/**
 * Prévient le label ou le compte de chaque artiste nouvellement proposé, avec
 * un lien direct vers la proposition. Best-effort : n'interrompt jamais
 * l'enregistrement de l'événement.
 */
export async function notifierPropositions(eventId: string, artisteIds: string[], proposeur: { id: string; email?: string }, origine: string) {
  if (!artisteIds.length) return;
  try {
    const [{ data: ev }, { data: arts }, { data: auteur }] = await Promise.all([
      supabaseAdmin.from("events").select("titre, date_debut, date_fin, lieu, ville").eq("id", eventId).maybeSingle(),
      supabaseAdmin.from("artistes").select("id, nom_scene, label_id, compte_id, cree_par").in("id", artisteIds),
      supabaseAdmin.from("profiles").select("nom, nom_public").eq("id", proposeur.id).maybeSingle(),
    ]);
    if (!ev) return;
    const organisateur = auteur?.nom_public || auteur?.nom || proposeur.email || "Un organisateur";
    for (const a of (arts ?? []) as Artiste[]) {
      const lien = `${origine}/orga/artistes?proposition=${cleProposition(eventId, a.id)}#proposition-${cleProposition(eventId, a.id)}`;
      const { subject, html } = emailPropositionRattachement({
        artiste: a.nom_scene,
        organisateur,
        evenement: ev.titre,
        quand: formatPlageDates(ev.date_debut, ev.date_fin, { avecAnnee: true }),
        ou: `${ev.lieu}, ${ev.ville}`,
        lien,
      });
      for (const id of decideurs(a).filter((x) => x !== proposeur.id)) {
        const to = await emailUtilisateur(id);
        if (to) await envoyerEmail({ to, subject, html }).catch((e) => console.error("[artistes] e-mail de proposition :", e));
      }
    }
  } catch (e) {
    console.error("[artistes] notification des propositions :", (e as Error).message);
  }
}

/** Proposition reçue par un label ou un artiste (section « Propositions » de Mes artistes). */
export interface PropositionRecue {
  cle: string;
  eventId: string;
  artisteId: string;
  artiste: string;
  photo: string | null;
  titre: string;
  slug: string;
  debut: string;
  fin: string | null;
  lieu: string;
  ville: string;
  statutEvenement: string;
  organisateur: string;
  proposeLe: string;
}

/** Propositions en attente pour les artistes que le compte gère, les plus anciennes d'abord. */
export async function propositionsRecues(userId: string, geres?: Artiste[]): Promise<PropositionRecue[]> {
  const ids = (geres ?? (await artistesGeres(userId))).map((a) => a.id);
  if (!ids.length) return [];
  return lirePropositions(supabaseAdmin.from("evenement_artistes").select(COLONNES_PROPOSITION).in("artiste_id", ids));
}

const COLONNES_PROPOSITION =
  "event_id, artiste_id, created_at, artiste:artistes(nom_scene, photo_url, statut), evenement:events(titre, slug, date_debut, date_fin, lieu, ville, statut, organisateur:profiles!organisateur_id(nom, nom_public))";

type LigneProposition = {
  event_id: string;
  artiste_id: string;
  created_at: string;
  artiste: { nom_scene: string; photo_url: string | null; statut: StatutArtiste } | null;
  evenement: { titre: string; slug: string; date_debut: string; date_fin: string | null; lieu: string; ville: string; statut: string; organisateur: { nom: string; nom_public: string | null } | null } | null;
};

/** Propositions en attente, toutes (file de l'admin) ou filtrées par la requête fournie. */
export async function lirePropositions(
  requete = supabaseAdmin.from("evenement_artistes").select(COLONNES_PROPOSITION),
): Promise<PropositionRecue[]> {
  const { data, error } = await requete.eq("statut", "propose").order("created_at", { ascending: true });
  if (error) {
    console.error("[artistes] lecture des propositions :", error.message);
    return [];
  }
  return ((data ?? []) as unknown as LigneProposition[]).flatMap((l) =>
    l.artiste && l.evenement
      ? [
          {
            cle: cleProposition(l.event_id, l.artiste_id),
            eventId: l.event_id,
            artisteId: l.artiste_id,
            artiste: l.artiste.nom_scene,
            photo: l.artiste.statut === "valide" ? l.artiste.photo_url : null,
            titre: l.evenement.titre,
            slug: l.evenement.slug,
            debut: l.evenement.date_debut,
            fin: l.evenement.date_fin,
            lieu: l.evenement.lieu,
            ville: l.evenement.ville,
            statutEvenement: l.evenement.statut,
            organisateur: l.evenement.organisateur?.nom_public || l.evenement.organisateur?.nom || "—",
            proposeLe: l.created_at,
          },
        ]
      : [],
  );
}

/**
 * Accepte ou refuse une proposition. Transition conditionnée au statut
 * « propose » : une décision déjà prise (autre onglet, label et admin en même
 * temps) n'est jamais écrasée. Renvoie le slug de l'événement et de l'artiste
 * pour la revalidation, ou null si rien n'a changé.
 */
export async function deciderProposition(eventId: string, artisteId: string, decision: "accepter" | "refuser", parId: string): Promise<{ evenement: string; artiste: string } | null> {
  const maintenant = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("evenement_artistes")
    .update(decision === "accepter" ? { statut: "accepte", accepte_par: parId, accepte_le: maintenant } : { statut: "refuse", refuse_par: parId, refuse_le: maintenant })
    .eq("event_id", eventId)
    .eq("artiste_id", artisteId)
    .eq("statut", "propose")
    .select("evenement:events(slug), artiste:artistes(slug)");
  if (error) {
    console.error("[artistes] décision sur une proposition :", error.message);
    return null;
  }
  const l = (data ?? [])[0] as unknown as { evenement: { slug: string } | null; artiste: { slug: string } | null } | undefined;
  return l ? { evenement: l.evenement?.slug ?? "", artiste: l.artiste?.slug ?? "" } : null;
}

/** Artiste rattaché à un événement, vu par son organisateur (fiche, modification). */
export interface RattachementOrga {
  id: string;
  nom: string;
  photo: string | null;
  statutArtiste: StatutArtiste;
  gere: boolean;
  statut: StatutRattachement;
  /** Date de la proposition, de l'accord ou du refus selon le statut. */
  le: string | null;
}

/** Artistes d'un événement dans l'ordre, avec l'état de chaque rattachement. Service_role : appeler après la preuve de propriété. */
export async function rattachementsEvenement(eventId: string, userId: string): Promise<RattachementOrga[]> {
  const { data, error } = await supabaseAdmin
    .from("evenement_artistes")
    .select("statut, created_at, accepte_le, refuse_le, artiste:artistes(id, nom_scene, photo_url, statut, cree_par, label_id, compte_id)")
    .eq("event_id", eventId)
    .order("ordre", { ascending: true });
  if (error) {
    console.error("[artistes] rattachements de l'événement :", error.message);
    return [];
  }
  type Ligne = { statut: StatutRattachement; created_at: string; accepte_le: string | null; refuse_le: string | null; artiste: Artiste | null };
  return ((data ?? []) as unknown as Ligne[]).flatMap((l) =>
    l.artiste
      ? [
          {
            id: l.artiste.id,
            nom: l.artiste.nom_scene,
            photo: l.artiste.statut === "valide" ? l.artiste.photo_url : null,
            statutArtiste: l.artiste.statut,
            gere: gere(l.artiste, userId),
            statut: l.statut,
            le: l.statut === "propose" ? l.created_at : l.statut === "refuse" ? l.refuse_le : l.accepte_le,
          },
        ]
      : [],
  );
}
