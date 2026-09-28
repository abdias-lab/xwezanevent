import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { trouverUserIdParEmail } from "@/lib/utilisateurs";

const LIMITE_CANDIDATS_REFERENCE = 2000;

/**
 * Commandes (tous statuts) correspondant à une recherche admin de la page
 * Billets : nom, téléphone, e-mail ou référence « XWZ-XXXXXXXX » (8 premiers
 * caractères de l'id de commande). Couvre les acheteurs avec compte
 * (profiles, auth.users) ET les invités (orders.acheteur_*, bug #6).
 * Réservé à l'admin : l'appelant a vérifié le rôle.
 */
export async function commandesCorrespondantes(texte: string): Promise<string[]> {
  const q = texte.trim();
  if (!q) return [];
  const ids = new Set<string>();
  const ajouter = (lignes: { id: string }[] | null) => (lignes ?? []).forEach((o) => ids.add(o.id));
  // Les jokers de ILIKE (% et _) saisis par l'admin sont neutralisés.
  const motif = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

  // Invités : identité portée par la commande.
  {
    const { data } = await supabaseAdmin.from("orders").select("id").ilike("acheteur_nom", motif);
    ajouter(data);
  }
  {
    const { data } = await supabaseAdmin.from("orders").select("id").ilike("acheteur_email", motif);
    ajouter(data);
  }

  // Comptes : nom du profil.
  const profilIds = new Set<string>();
  {
    const { data } = await supabaseAdmin.from("profiles").select("id").ilike("nom", motif).limit(50);
    (data ?? []).forEach((p) => profilIds.add(p.id));
  }

  // Téléphone : chiffres seulement, au moins 4, séparateurs ignorés des deux
  // côtés (regex PostgREST) : « 97 42 18 » trouve « 0197421863 » comme
  // « 01 97 42 18 63 » (téléphone d'invité non normalisé, bug #11).
  const chiffres = q.replace(/\D/g, "");
  if (chiffres.length >= 4) {
    const motifTel = chiffres.split("").join("\\D*");
    const { data: inv } = await supabaseAdmin.from("orders").select("id").filter("acheteur_telephone", "imatch", motifTel);
    ajouter(inv);
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").filter("telephone", "imatch", motifTel).limit(50);
    (prof ?? []).forEach((p) => profilIds.add(p.id));
  }

  // E-mail d'un compte : adresse complète uniquement (auth.users).
  if (q.includes("@")) {
    const userId = await trouverUserIdParEmail(q);
    if (userId) profilIds.add(userId);
  }

  if (profilIds.size > 0) {
    const { data } = await supabaseAdmin.from("orders").select("id").in("user_id", Array.from(profilIds));
    ajouter(data);
  }

  // Référence : PostgREST ne filtre pas ILIKE sur une colonne UUID (voir
  // lib/billets.ts) ; préfixe comparé côté application, requête bornée.
  const fragment = q.replace(/^#?xwz-?/i, "").replace(/[^a-f0-9]/gi, "").toLowerCase();
  if (fragment.length >= 4) {
    const { data } = await supabaseAdmin
      .from("orders")
      .select("id")
      .in("statut", ["paye", "rembourse"])
      .order("created_at", { ascending: false })
      .limit(LIMITE_CANDIDATS_REFERENCE);
    (data ?? []).forEach((o) => {
      if (o.id.slice(0, 8).toLowerCase().startsWith(fragment)) ids.add(o.id);
    });
  }

  return Array.from(ids);
}
