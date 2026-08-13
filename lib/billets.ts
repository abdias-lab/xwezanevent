import "server-only";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { trouverUserIdParEmail } from "@/lib/utilisateurs";

export function isUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export type ScanResult =
  | { ok: true; nom_titulaire: string; type_billet: string; event_titre: string }
  | { ok: false; raison: string; utilise_le?: string };

/**
 * Valide un billet via le RPC `valider_billet` (SECURITY DEFINER, atomique,
 * refuse déjà-utilisé/annulé/événement terminé/non-autorisé). C'est
 * l'UNIQUE chemin de validation — utilisé aussi bien par le scan QR que par
 * la validation manuelle, pour qu'aucune des deux voies ne puisse
 * contourner les contrôles de l'autre.
 */
export async function validerBilletParCodeQr(
  codeQr: string,
  userId: string
): Promise<ScanResult> {
  const { data, error } = await supabaseAdmin.rpc("valider_billet", {
    p_code_qr: codeQr,
    p_user_id: userId,
  });
  if (error) {
    console.error("[billets] RPC valider_billet :", error.message);
    throw error;
  }
  return data as ScanResult;
}

/**
 * Miroir de validerBilletParCodeQr pour le scan par lien délégué (voir
 * supabase/migrations/20260811120000_lien_scan_evenement.sql) : appelle
 * `valider_billet_lien`, dont l'autorisation ne repose pas sur un compte
 * mais uniquement sur `eventId` — déjà résolu depuis le jeton par
 * l'appelant (lib/scan-liens.ts), jamais fourni par le client sans
 * vérification.
 */
export async function validerBilletParCodeQrEtEvenement(
  codeQr: string,
  eventId: string
): Promise<ScanResult> {
  const { data, error } = await supabaseAdmin.rpc("valider_billet_lien", {
    p_code_qr: codeQr,
    p_event_id: eventId,
  });
  if (error) {
    console.error("[billets] RPC valider_billet_lien :", error.message);
    throw error;
  }
  return data as ScanResult;
}

export interface BilletTrouve {
  ticket_id: string;
  code_qr: string;
  statut: string;
  utilise_le: string | null;
  type_billet: string;
  event_titre: string;
  acheteur_nom: string;
  reference_commande: string;
  commande_creee_le: string;
}

interface OrdreCandidat {
  id: string;
  created_at: string;
  event_id: string;
  user_id: string | null;
}

const LIMITE_RESULTATS = 25;
const LIMITE_CANDIDATS_REFERENCE = 2000;

function normaliserFragmentReference(texte: string): string {
  return texte.replace(/[^a-f0-9]/gi, "").toLowerCase();
}

/** Événements possédés par cet organisateur (pour scoper la recherche). */
export async function idsEvenementsOrganisateur(organisateurId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("organisateur_id", organisateurId);
  return (data ?? []).map((e) => e.id);
}

/**
 * Recherche des billets par nom d'acheteur, email, ou référence de
 * commande (les 8 premiers caractères de l'id, affichés à l'acheteur sous
 * la forme "#XWZ-XXXXXXXX"). Scopée à `eventIdsAutorises` (null = pas de
 * scope, réservé à l'admin) — même filtre que celui appliqué en base par
 * `valider_billet`/`valider_billet_lien` : si ce filtre applicatif avait un
 * bug, la validation elle-même refuserait quand même (défense en
 * profondeur). Le calcul de la liste (tous les événements d'un
 * organisateur, ou un seul événement pour un lien de scan délégué) est la
 * responsabilité de l'appelant — voir app/api/scan/recherche/route.ts et
 * app/api/scan/lien/recherche/route.ts.
 */
export async function rechercherBillets(
  texte: string,
  eventIdsAutorises: string[] | null
): Promise<BilletTrouve[]> {
  const requete = texte.trim();
  if (!requete) return [];

  if (eventIdsAutorises && eventIdsAutorises.length === 0) return [];

  const ordreIds = new Set<string>();

  if (requete.includes("@")) {
    // Mode email : une seule adresse ne peut correspondre qu'à un seul compte.
    const userId = await trouverUserIdParEmail(requete);
    if (userId) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("id, created_at, event_id, user_id")
        .eq("user_id", userId)
        .eq("statut", "paye");
      for (const o of (data ?? []) as OrdreCandidat[]) {
        if (!eventIdsAutorises || eventIdsAutorises.includes(o.event_id)) {
          ordreIds.add(o.id);
        }
      }
    }

    // Commandes invité (voir supabase/migrations/20260804120000_achat_invite.sql) :
    // identité portée directement par la commande, pas par un compte —
    // sans ce chemin, un invité serait introuvable par email/support.
    const { data: commandesInvite } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, event_id, user_id")
      .eq("acheteur_email", requete.trim().toLowerCase())
      .eq("statut", "paye");
    for (const o of (commandesInvite ?? []) as OrdreCandidat[]) {
      if (!eventIdsAutorises || eventIdsAutorises.includes(o.event_id)) {
        ordreIds.add(o.id);
      }
    }
  } else {
    // Mode nom : profils dont le nom correspond, puis leurs commandes payées.
    const { data: profils } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("nom", `%${requete}%`)
      .limit(20);
    const profilIds = (profils ?? []).map((p) => p.id);
    if (profilIds.length > 0) {
      const { data } = await supabaseAdmin
        .from("orders")
        .select("id, created_at, event_id, user_id")
        .in("user_id", profilIds)
        .eq("statut", "paye");
      for (const o of (data ?? []) as OrdreCandidat[]) {
        if (!eventIdsAutorises || eventIdsAutorises.includes(o.event_id)) {
          ordreIds.add(o.id);
        }
      }
    }

    // Commandes invité dont le nom saisi à l'achat correspond.
    const { data: commandesInviteNom } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, event_id, user_id")
      .ilike("acheteur_nom", `%${requete}%`)
      .eq("statut", "paye");
    for (const o of (commandesInviteNom ?? []) as OrdreCandidat[]) {
      if (!eventIdsAutorises || eventIdsAutorises.includes(o.event_id)) {
        ordreIds.add(o.id);
      }
    }

    // Mode référence : PostgREST ne sait pas filtrer ILIKE sur une colonne
    // UUID (vérifié : "operator does not exist: uuid ~~* unknown") — on
    // borne donc la requête (commandes payées, scope organisateur) et on
    // compare le préfixe côté application.
    const fragment = normaliserFragmentReference(requete);
    if (fragment.length >= 4) {
      let q = supabaseAdmin
        .from("orders")
        .select("id, created_at, event_id, user_id")
        .eq("statut", "paye")
        .order("created_at", { ascending: false })
        .limit(LIMITE_CANDIDATS_REFERENCE);
      if (eventIdsAutorises) q = q.in("event_id", eventIdsAutorises);
      const { data } = await q;
      for (const o of (data ?? []) as OrdreCandidat[]) {
        if (o.id.slice(0, 8).toLowerCase().startsWith(fragment)) {
          ordreIds.add(o.id);
        }
      }
    }
  }

  if (ordreIds.size === 0) return [];

  const { data: tickets, error } = await supabaseAdmin
    .from("tickets")
    .select(
      "id, statut, utilise_le, code_qr, order_id, ticket_types(nom, events(titre)), orders(id, created_at, profiles(nom), acheteur_nom)"
    )
    .in("order_id", Array.from(ordreIds))
    .order("created_at", { ascending: false })
    .limit(LIMITE_RESULTATS);
  if (error) throw error;

  return ((tickets ?? []) as unknown as {
    id: string;
    statut: string;
    utilise_le: string | null;
    code_qr: string;
    ticket_types: { nom: string; events: { titre: string } | null } | null;
    orders: {
      id: string;
      created_at: string;
      profiles: { nom: string } | null;
      acheteur_nom: string | null;
    } | null;
  }[]).map((t) => ({
    ticket_id: t.id,
    code_qr: t.code_qr,
    statut: t.statut,
    utilise_le: t.utilise_le,
    type_billet: t.ticket_types?.nom ?? "—",
    event_titre: t.ticket_types?.events?.titre ?? "—",
    // Compte : nom via profiles. Invité : nom saisi à l'achat (acheteur_nom),
    // orders.profiles est alors toujours null (voir migration achat_invite).
    acheteur_nom: t.orders?.profiles?.nom ?? t.orders?.acheteur_nom ?? "—",
    reference_commande: `XWZ-${(t.orders?.id ?? "").slice(0, 8).toUpperCase()}`,
    commande_creee_le: t.orders?.created_at ?? "",
  }));
}

export interface LigneExportBillet {
  acheteur_nom: string;
  acheteur_email: string;
  type_billet: string;
  reference_commande: string;
  statut: string;
  achete_le: string;
  utilise_le: string | null;
}

const PAGE = 1000;

/**
 * Tous les billets d'UN événement précis (validé par l'appelant AVANT
 * d'appeler cette fonction — elle ne fait aucune vérification d'autorisation
 * elle-même), toutes tickets confondus (y compris annulés), paginé sans
 * plafond — contrairement à /admin/billets, un export doit être complet.
 */
export async function recupererBilletsPourExport(eventId: string): Promise<LigneExportBillet[]> {
  const brut: {
    id: string;
    statut: string;
    utilise_le: string | null;
    ticket_types: { nom: string; event_id: string } | null;
    orders: {
      id: string;
      created_at: string;
      user_id: string | null;
      acheteur_nom: string | null;
      acheteur_email: string | null;
      profiles: { nom: string } | null;
    } | null;
  }[] = [];

  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from("tickets")
      .select(
        "id, statut, utilise_le, ticket_types!inner(nom, event_id), orders!inner(id, created_at, user_id, acheteur_nom, acheteur_email, profiles(nom))"
      )
      .eq("ticket_types.event_id", eventId)
      .order("created_at", { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    brut.push(...((data ?? []) as unknown as typeof brut));
    if (!data || data.length < PAGE) break;
  }

  const userIds = Array.from(new Set(brut.map((t) => t.orders?.user_id).filter((v): v is string => !!v)));
  const emailParId = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data?.user?.email) emailParId.set(id, data.user.email);
    })
  );

  return brut.map((t) => ({
    // Compte : nom/email via profiles/auth.users. Invité : acheteur_nom/
    // acheteur_email saisis à l'achat (orders.user_id est alors NULL, voir
    // supabase/migrations/20260804120000_achat_invite.sql).
    acheteur_nom: t.orders?.profiles?.nom ?? t.orders?.acheteur_nom ?? "—",
    acheteur_email:
      (t.orders?.user_id && emailParId.get(t.orders.user_id)) ?? t.orders?.acheteur_email ?? "—",
    type_billet: t.ticket_types?.nom ?? "—",
    reference_commande: `XWZ-${(t.orders?.id ?? "").slice(0, 8).toUpperCase()}`,
    statut: t.statut,
    achete_le: t.orders?.created_at ?? "",
    utilise_le: t.utilise_le,
  }));
}
