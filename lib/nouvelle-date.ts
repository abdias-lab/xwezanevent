import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur, envoyerLotEmails } from "@/lib/email";
import { emailNouvelleDate } from "@/lib/emails/nouvelle-date";
import { aujourdhuiPortoNovo, formatPlageDates } from "@/lib/date";

/**
 * E-mail « nouvelle date » aux abonnés des artistes d'un événement
 * (design/ARTISTES.md, lot 3). Déclencheurs : validation admin, publication
 * directe d'un compte vérifié, acceptation d'un rattachement proposé, ajout
 * d'un artiste géré à un événement déjà en ligne (/modifier).
 *
 * Règles :
 * - événement publié, à venir et vente ouverte (au moins un tarif non
 *   complet dont la vente n'est pas close), jamais un événement vitrine ;
 * - artistes validés et rattachements acceptés seulement ;
 * - un seul e-mail par abonné et par événement (notifications_nouvelle_date),
 *   tous les abonnés quel que soit leur pays ;
 * - registre écrit APRÈS chaque lot Resend réussi, jamais avant : un lot en
 *   échec laisse ses abonnés non marqués, un nouvel appel ne repart que sur
 *   eux. Clé d'idempotence par lot : deux déclenchements simultanés ne
 *   renvoient pas le même lot.
 *
 * Limite connue (ARTISTES.md) : l'envoi se fait dans la requête qui le
 * déclenche et la fait attendre.
 */

const LOT = 100;
/** Recherches d'adresses e-mail menées en parallèle (API admin d'auth, une requête par abonné). */
const PARALLELE = 10;

export type BilanNouvelleDate =
  | { envoye: false; raison: "introuvable" | "pas_en_ligne" | "passe" | "vente_close" | "aucun_abonne" }
  | { envoye: true; servis: number; dejaServis: number; enEchec: number; sansEmail: number };

type Evenement = {
  id: string;
  titre: string;
  slug: string;
  statut: string;
  est_demo: boolean;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  lieu: string;
  ville: string;
  affiche_url: string | null;
  ticket_types: { quantite_totale: number; quantite_vendue: number; vente_jusqua: string | null }[];
};

/** Vente ouverte : au moins un tarif avec des places et une vente non close. */
export function venteOuverte(tarifs: Evenement["ticket_types"], maintenant = new Date()): boolean {
  return tarifs.some((t) => t.quantite_vendue < t.quantite_totale && (!t.vente_jusqua || new Date(t.vente_jusqua) > maintenant));
}

async function enParallele<T, R>(elements: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const resultats: R[] = new Array(elements.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, elements.length) }, async () => {
      while (i < elements.length) {
        const k = i++;
        resultats[k] = await f(elements[k]);
      }
    }),
  );
  return resultats;
}

/**
 * Envoie la « nouvelle date » d'un événement. `artisteIds` : limite l'envoi
 * aux abonnés de ces artistes (rattachement accepté, ajout dans /modifier) ;
 * absent, tous les artistes acceptés de l'événement (publication).
 * Best-effort : ne lève jamais d'exception, l'opération qui déclenche ne
 * doit pas échouer à cause d'un e-mail.
 */
export async function notifierNouvelleDate(eventId: string, origine: string, artisteIds?: string[]): Promise<BilanNouvelleDate> {
  try {
    return await notifier(eventId, origine, artisteIds);
  } catch (e) {
    console.error("[nouvelle-date] exception :", (e as Error).message);
    return { envoye: true, servis: 0, dejaServis: 0, enEchec: -1, sansEmail: 0 };
  }
}

async function notifier(eventId: string, origine: string, artisteIds?: string[]): Promise<BilanNouvelleDate> {
  const debut = Date.now();
  const { data } = await supabaseAdmin
    .from("events")
    .select("id, titre, slug, statut, est_demo, date_debut, date_fin, heure, lieu, ville, affiche_url, ticket_types(quantite_totale, quantite_vendue, vente_jusqua)")
    .eq("id", eventId)
    .maybeSingle();
  const ev = data as Evenement | null;
  if (!ev) return { envoye: false, raison: "introuvable" };
  if (ev.statut !== "publie" || ev.est_demo) return { envoye: false, raison: "pas_en_ligne" };
  if ((ev.date_fin ?? ev.date_debut) < aujourdhuiPortoNovo()) return { envoye: false, raison: "passe" };
  if (!venteOuverte(ev.ticket_types)) return { envoye: false, raison: "vente_close" };

  // Artistes concernés : rattachements acceptés, artistes validés.
  let requete = supabaseAdmin.from("evenement_artistes").select("ordre, artiste:artistes(id, nom_scene, statut)").eq("event_id", eventId).eq("statut", "accepte");
  if (artisteIds) requete = requete.in("artiste_id", artisteIds.length ? artisteIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data: lignes } = await requete.order("ordre", { ascending: true });
  type Ligne = { artiste: { id: string; nom_scene: string; statut: string } | null };
  const artistes = ((lignes ?? []) as unknown as Ligne[]).flatMap((l) => (l.artiste && l.artiste.statut === "valide" ? [l.artiste] : []));
  if (!artistes.length) return { envoye: false, raison: "aucun_abonne" };
  const nomArtiste = new Map(artistes.map((a) => [a.id, a.nom_scene]));

  // Abonnés, regroupés par personne (un e-mail par abonné et par événement).
  const { data: abos } = await supabaseAdmin
    .from("abonnements")
    .select("user_id, artiste_id, jeton_desabonnement")
    .in(
      "artiste_id",
      artistes.map((a) => a.id),
    );
  const parAbonne = new Map<string, { artiste: string; jeton: string }[]>();
  for (const a of abos ?? []) {
    const liste = parAbonne.get(a.user_id) ?? [];
    liste.push({ artiste: nomArtiste.get(a.artiste_id as string) ?? "", jeton: a.jeton_desabonnement });
    parAbonne.set(a.user_id, liste);
  }
  if (!parAbonne.size) return { envoye: false, raison: "aucun_abonne" };

  // Déjà servis pour cet événement (autre déclencheur, autre artiste) : exclus.
  const { data: deja } = await supabaseAdmin.from("notifications_nouvelle_date").select("user_id").eq("event_id", eventId).in("user_id", Array.from(parAbonne.keys()));
  const servis = new Set((deja ?? []).map((d) => d.user_id as string));
  const aServir = Array.from(parAbonne.keys())
    .filter((u) => !servis.has(u))
    .sort();

  const emails = await enParallele(aServir, PARALLELE, (u) => emailUtilisateur(u));
  const quand = `${formatPlageDates(ev.date_debut, ev.date_fin, { avecAnnee: true })}${ev.heure ? ` · ${String(ev.heure).slice(0, 5)}` : ""}`;
  const quandCourt = formatPlageDates(ev.date_debut, ev.date_fin, { avecAnnee: false });
  const lienEvenement = `${origine}/evenement/${ev.slug}`;

  const messages: { userId: string; to: string; subject: string; html: string; headers: Record<string, string> }[] = [];
  aServir.forEach((userId, i) => {
    const to = emails[i];
    if (!to) return;
    const suivis = parAbonne.get(userId)!;
    const { subject, html } = emailNouvelleDate({
      artistes: suivis.map((s) => s.artiste),
      titre: ev.titre,
      quand,
      quandCourt,
      ou: `${ev.lieu}, ${ev.ville}`,
      image: ev.affiche_url,
      lien: lienEvenement,
      desabonnements: suivis.map((s) => ({ artiste: s.artiste, lien: `${origine}/desabonnement/${s.jeton}` })),
    });
    messages.push({
      userId,
      to,
      subject,
      html,
      // Désabonnement en un clic natif (RFC 8058) : sans List-Unsubscribe-Post, Gmail n'affiche pas le bouton.
      headers: {
        "List-Unsubscribe": `<${origine}/api/desabonnement/${suivis[0].jeton}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  });

  let nbServis = 0;
  let enEchec = 0;
  for (let i = 0; i < messages.length; i += LOT) {
    const lot = messages.slice(i, i + LOT);
    const cle = `nouvelle-date/${eventId}/${createHash("sha256").update(lot.map((m) => m.userId).join(",")).digest("hex").slice(0, 32)}`;
    const ok = await envoyerLotEmails(
      lot.map(({ to, subject, html, headers }) => ({ to, subject, html, headers })),
      cle,
    );
    if (!ok) {
      enEchec += lot.length;
      console.error(`[nouvelle-date] lot ${i / LOT + 1} en échec pour l'événement ${eventId} : ${lot.length} abonné(s) non marqués, à relancer`);
      continue;
    }
    // Registre APRÈS le lot réussi. Un doublon (déclenchement simultané) n'est pas une erreur.
    const { error } = await supabaseAdmin
      .from("notifications_nouvelle_date")
      .upsert(lot.map((m) => ({ event_id: eventId, user_id: m.userId })), { onConflict: "event_id,user_id", ignoreDuplicates: true });
    if (error) console.error(`[nouvelle-date] registre du lot ${i / LOT + 1} non écrit (lot envoyé) :`, error.message);
    nbServis += lot.length;
  }
  const bilan = { envoye: true as const, servis: nbServis, dejaServis: servis.size, enEchec, sansEmail: aServir.length - messages.length };
  // Durée journalisée : sert à suivre le seuil au-delà duquel l'envoi doit sortir de la requête (ARTISTES.md).
  console.log(`[nouvelle-date] événement ${eventId} :`, JSON.stringify(bilan), `${Date.now() - debut} ms`);
  return bilan;
}
