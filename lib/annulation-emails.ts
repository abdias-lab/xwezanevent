import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur, envoyerLotEmails } from "@/lib/email";
import { emailAnnulation } from "@/lib/emails/annulation";
import { formatPlageDates } from "@/lib/date";

/**
 * E-mail d'annulation aux acheteurs (design/BUGS_REFONTE.md n°7). Même
 * schéma que « nouvelle date » (lib/nouvelle-date.ts) :
 * - destinataires : chaque commande PAYÉE de l'événement annulé (ses billets
 *   valides ont été annulés par annuler_evenement) ; compte ou invité ;
 * - registre notifications_annulation écrit APRÈS chaque lot Resend réussi,
 *   jamais avant : une relance (POST /api/admin/events/[id]/annulation-email)
 *   ne sert que les commandes non marquées ; clé d'idempotence par lot.
 * Best-effort : n'interrompt jamais l'annulation. L'envoi se fait dans la
 * requête d'annulation (même limite connue que « nouvelle date »).
 */

const LOT = 100;
const PARALLELE = 10;

export type BilanAnnulation =
  | { envoye: false; raison: "introuvable" | "pas_annule" | "aucune_commande" }
  | { envoye: true; servis: number; dejaServis: number; enEchec: number; sansEmail: number };

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

export async function notifierAnnulation(eventId: string, origine: string): Promise<BilanAnnulation> {
  try {
    return await notifier(eventId, origine);
  } catch (e) {
    console.error("[annulation-emails] exception :", (e as Error).message);
    return { envoye: true, servis: 0, dejaServis: 0, enEchec: -1, sansEmail: 0 };
  }
}

async function notifier(eventId: string, origine: string): Promise<BilanAnnulation> {
  const debut = Date.now();
  const { data: ev } = await supabaseAdmin.from("events").select("titre, statut, date_debut, date_fin, heure, lieu, ville").eq("id", eventId).maybeSingle();
  if (!ev) return { envoye: false, raison: "introuvable" };
  if (ev.statut !== "annule") return { envoye: false, raison: "pas_annule" };

  const { data: commandes } = await supabaseAdmin
    .from("orders")
    .select("id, total, user_id, acheteur_email, tickets(count)")
    .eq("event_id", eventId)
    .eq("statut", "paye")
    .order("created_at", { ascending: true });
  type Commande = { id: string; total: number; user_id: string | null; acheteur_email: string | null; tickets: { count: number }[] };
  const toutes = (commandes ?? []) as unknown as Commande[];
  if (!toutes.length) return { envoye: false, raison: "aucune_commande" };

  const { data: deja } = await supabaseAdmin.from("notifications_annulation").select("order_id").in("order_id", toutes.map((c) => c.id));
  const servies = new Set((deja ?? []).map((d) => d.order_id as string));
  const aServir = toutes.filter((c) => !servies.has(c.id));

  // Compte : e-mail dans auth.users ; invité : e-mail porté par la commande.
  const emails = await enParallele(aServir, PARALLELE, (c) => (c.user_id ? emailUtilisateur(c.user_id) : Promise.resolve(c.acheteur_email)));
  const quand = `${formatPlageDates(ev.date_debut, ev.date_fin, { avecAnnee: true })}${ev.heure ? ` · ${String(ev.heure).slice(0, 5)}` : ""}`;

  const messages: { orderId: string; to: string; subject: string; html: string }[] = [];
  aServir.forEach((c, i) => {
    const to = emails[i];
    if (!to) return;
    const { subject, html } = emailAnnulation({
      titre: ev.titre,
      quand,
      ou: `${ev.lieu}, ${ev.ville}`,
      total: c.total,
      billets: c.tickets[0]?.count ?? 1,
      reference: `XWZ-${c.id.slice(0, 8).toUpperCase()}`,
      lien: c.user_id ? `${origine}/compte` : `${origine}/remboursements`,
      avecCompte: !!c.user_id,
    });
    messages.push({ orderId: c.id, to, subject, html });
  });

  let servis = 0;
  let enEchec = 0;
  for (let i = 0; i < messages.length; i += LOT) {
    const lot = messages.slice(i, i + LOT);
    const cle = `annulation/${eventId}/${createHash("sha256").update(lot.map((m) => m.orderId).join(",")).digest("hex").slice(0, 32)}`;
    const ok = await envoyerLotEmails(
      lot.map(({ to, subject, html }) => ({ to, subject, html })),
      cle,
    );
    if (!ok) {
      enEchec += lot.length;
      console.error(`[annulation-emails] lot ${i / LOT + 1} en échec pour l'événement ${eventId} : ${lot.length} commande(s) non marquées, à relancer`);
      continue;
    }
    const { error } = await supabaseAdmin
      .from("notifications_annulation")
      .upsert(lot.map((m) => ({ order_id: m.orderId })), { onConflict: "order_id", ignoreDuplicates: true });
    if (error) console.error(`[annulation-emails] registre du lot ${i / LOT + 1} non écrit (lot envoyé) :`, error.message);
    servis += lot.length;
  }
  const bilan = { envoye: true as const, servis, dejaServis: servies.size, enEchec, sansEmail: aServir.length - messages.length };
  console.log(`[annulation-emails] événement ${eventId} :`, JSON.stringify(bilan), `${Date.now() - debut} ms`);
  return bilan;
}
