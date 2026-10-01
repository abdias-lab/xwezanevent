import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifierAdmin, journaliserActionAdmin } from "@/lib/admin-auth";
import { emailUtilisateur, envoyerEmail } from "@/lib/email";
import { emailArtisteRefuse, emailArtisteValide, emailNomAccepte, emailNomRefuse } from "@/lib/emails/artiste-statut";

const MOTIF_MAX = 1000;
const ACTIONS = ["valider", "valider_verifier", "refuser", "accepter_nom", "refuser_nom"] as const;
type Action = (typeof ACTIONS)[number];

function origine(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Décision de l'admin sur une demande d'artiste (design/ARTISTES.md) :
 * - création en validation : valider, valider et vérifier le compte du
 *   demandeur (comptes_verifies), ou refuser (motif facultatif) ;
 * - changement de nom d'une page en ligne : accepter ou refuser le nouveau nom.
 * E-mail au demandeur dans tous les cas ; action journalisée. La transition
 * est conditionnée au statut attendu : une décision déjà prise (autre onglet,
 * double clic) est refusée sans rien modifier.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { adminId, erreur } = await verifierAdmin();
  if (erreur) return erreur;

  const body = await req.json().catch(() => ({}));
  const action = body?.action as Action;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const motif = typeof body.motif === "string" ? body.motif.trim() : "";
  if (motif.length > MOTIF_MAX) return NextResponse.json({ error: `${MOTIF_MAX} caractères maximum pour le motif` }, { status: 400 });

  const { data: a } = await supabaseAdmin
    .from("artistes")
    .select("id, slug, nom_scene, nom_scene_demande, statut, cree_par")
    .eq("id", params.id)
    .maybeSingle();
  if (!a) return NextResponse.json({ error: "Artiste introuvable" }, { status: 404 });

  const maintenant = new Date().toISOString();
  const deja = NextResponse.json({ error: "Cette demande a déjà été traitée." }, { status: 409 });
  let requete;
  if (action === "valider" || action === "valider_verifier") {
    requete = supabaseAdmin.from("artistes").update({ statut: "valide", valide_le: maintenant, motif_refus: null }).eq("id", a.id).eq("statut", "en_validation");
  } else if (action === "refuser") {
    requete = supabaseAdmin.from("artistes").update({ statut: "refuse", motif_refus: motif || null }).eq("id", a.id).eq("statut", "en_validation");
  } else {
    if (a.statut !== "valide" || !a.nom_scene_demande) return deja;
    requete = supabaseAdmin
      .from("artistes")
      .update(action === "accepter_nom" ? { nom_scene: a.nom_scene_demande, nom_scene_demande: null } : { nom_scene_demande: null })
      .eq("id", a.id)
      .eq("nom_scene_demande", a.nom_scene_demande);
  }
  const { data: modifie, error } = await requete.select("id");
  if (error) {
    console.error("[api/admin/artistes/decision] :", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
  if (!modifie || modifie.length === 0) return deja;

  if (action === "valider_verifier" && a.cree_par) {
    const { error: e } = await supabaseAdmin
      .from("comptes_verifies")
      .upsert({ user_id: a.cree_par, verifie_le: maintenant, verifie_par: adminId, note: `Vérifié à la validation de l'artiste « ${a.nom_scene} ».` });
    if (e) console.error("[api/admin/artistes/decision] vérification du compte :", e.message);
  }

  // E-mail au demandeur (best effort : la décision est déjà enregistrée).
  const destinataire = a.cree_par ? await emailUtilisateur(a.cree_par) : null;
  if (destinataire) {
    const base = origine(req);
    const lienPage = `${base}/artiste/${a.slug}`;
    const lienOrga = `${base}/orga/artistes`;
    const { subject, html } =
      action === "refuser"
        ? emailArtisteRefuse({ nom: a.nom_scene, motif: motif || null, lienOrga })
        : action === "accepter_nom"
          ? emailNomAccepte({ ancien: a.nom_scene, nouveau: a.nom_scene_demande!, lienPage })
          : action === "refuser_nom"
            ? emailNomRefuse({ ancien: a.nom_scene, nouveau: a.nom_scene_demande!, motif: motif || null, lienOrga })
            : emailArtisteValide({ nom: a.nom_scene, lienPage });
    await envoyerEmail({ to: destinataire, subject, html }).catch((e) => console.error("[api/admin/artistes/decision] e-mail :", e));
  }

  journaliserActionAdmin(adminId, `artiste : ${action.replace("_", " ")}`, { artiste_id: a.id, nom: a.nom_scene, ...(motif ? { motif } : {}) });
  revalidatePath(`/artiste/${a.slug}`);
  return NextResponse.json({ ok: true });
}
