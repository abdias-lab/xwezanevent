import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur } from "@/lib/email";

export interface AchatEnDouble {
  /** Commande d'origine de la chaîne (orders.recommencee_depuis). */
  origine: string;
  acheteur: string;
  email: string | null;
  telephone: string | null;
  evenement: string;
  /** Commandes payées du groupe, la plus ancienne d'abord. */
  commandes: { id: string; total: number; creeeLe: string }[];
}

interface LigneCommande {
  id: string;
  total: number;
  created_at: string;
  user_id: string | null;
  acheteur_nom: string | null;
  acheteur_email: string | null;
  acheteur_telephone: string | null;
  recommencee_depuis: string | null;
  events: { titre: string } | null;
  profiles: { nom: string | null; telephone: string | null } | null;
}

/**
 * Achats payés en double après « Recommencer l'achat » (BUGS_REFONTE n°25) :
 * l'acheteur a recommencé alors que sa première tentative, restée
 * « pending » chez FedaPay, a finalement été validée. Chaque groupe (une
 * commande d'origine et celles qui en ont été recommencées) ne devrait
 * compter qu'une commande payée : au-delà, il y a un paiement à rembourser.
 * Réservé à l'admin : l'appelant a vérifié le rôle.
 */
export async function getAchatsEnDouble(): Promise<AchatEnDouble[]> {
  const colonnes =
    "id, total, created_at, user_id, acheteur_nom, acheteur_email, acheteur_telephone, recommencee_depuis, events(titre), profiles(nom, telephone)";

  // 1. Commandes recommencées et payées : leurs origines sont les groupes à examiner.
  const { data: enfants, error } = await supabaseAdmin
    .from("orders")
    .select(colonnes)
    .eq("statut", "paye")
    .not("recommencee_depuis", "is", null);
  if (error) {
    console.error("[achats-doubles] lecture impossible :", error.message);
    return [];
  }
  const lignes = (enfants ?? []) as unknown as LigneCommande[];
  if (lignes.length === 0) return [];
  const origines = Array.from(new Set(lignes.map((o) => o.recommencee_depuis as string)));

  // 2. Les origines elles-mêmes, si elles ont été payées.
  const { data: parents } = await supabaseAdmin.from("orders").select(colonnes).eq("statut", "paye").in("id", origines);
  const toutes = [...((parents ?? []) as unknown as LigneCommande[]), ...lignes];

  const groupes = new Map<string, LigneCommande[]>();
  for (const o of toutes) {
    const cle = o.recommencee_depuis ?? o.id;
    groupes.set(cle, [...(groupes.get(cle) ?? []), o]);
  }

  const doubles: AchatEnDouble[] = [];
  for (const [origine, commandes] of Array.from(groupes.entries())) {
    if (commandes.length < 2) continue;
    commandes.sort((a, b) => a.created_at.localeCompare(b.created_at));
    const premiere = commandes[0];
    doubles.push({
      origine,
      acheteur: premiere.acheteur_nom ?? premiere.profiles?.nom ?? "—",
      email: premiere.acheteur_email ?? (premiere.user_id ? await emailUtilisateur(premiere.user_id) : null),
      telephone: premiere.acheteur_telephone ?? premiere.profiles?.telephone ?? null,
      evenement: premiere.events?.titre ?? "—",
      commandes: commandes.map((c) => ({ id: c.id, total: c.total, creeeLe: c.created_at })),
    });
  }
  return doubles.sort((a, b) => b.commandes[0].creeeLe.localeCompare(a.commandes[0].creeeLe));
}
