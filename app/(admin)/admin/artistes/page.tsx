import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur } from "@/lib/email";
import { formaterNumero } from "@/lib/telephone";
import { RESEAUX, lirePropositions, type CleReseau } from "@/lib/artistes";
import { formatPlageDates } from "@/lib/date";
import PropositionsArtistes, { type Contact, type PropositionAdmin } from "@/components/v2/admin/PropositionsArtistes";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateAnnee, depuis } from "@/components/v2/format";
import ValidationArtistes, { type DemandeArtiste } from "@/components/v2/admin/ValidationArtistes";
import { initialesArtiste } from "@/components/v2/orga/artistes/initiales";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Artistes — Administration — XwézanEvent" };

const FILTRES = [
  { cle: "", libelle: "À valider" },
  { cle: "propositions", libelle: "Propositions" },
  { cle: "valide", libelle: "En ligne" },
  { cle: "refuse", libelle: "Refusés" },
] as const;

interface LigneArtiste {
  id: string;
  slug: string;
  nom_scene: string;
  nom_scene_demande: string | null;
  bio: string | null;
  photo_url: string | null;
  liens: Partial<Record<CleReseau, string>> | null;
  type_demande: "label" | "auto_produit";
  label_id: string | null;
  cree_par: string | null;
  whatsapp_contact: string | null;
  statut: "en_validation" | "valide" | "refuse";
  motif_refus: string | null;
  soumis_le: string | null;
  updated_at: string;
  valide_le: string | null;
}

const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

/**
 * Artistes (admin, design/ARTISTES.md) : file des demandes à valider
 * (nouvelles pages et changements de nom de pages en ligne), avec les
 * coordonnées du demandeur pour obtenir ses pièces, puis les artistes en
 * ligne et refusés. Décisions : /api/admin/artistes/[id]/decision.
 */
export default async function AdminArtistes({ searchParams }: { searchParams: { filtre?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/artistes");
  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const filtre = FILTRES.find((f) => f.cle === searchParams.filtre) ?? FILTRES[0];

  const [{ data: artistesData }, { data: verifiesData }, enAttente] = await Promise.all([
    supabaseAdmin
      .from("artistes")
      .select("id, slug, nom_scene, nom_scene_demande, bio, photo_url, liens, type_demande, label_id, cree_par, whatsapp_contact, statut, motif_refus, soumis_le, updated_at, valide_le")
      .order("soumis_le", { ascending: true, nullsFirst: false }),
    supabaseAdmin.from("comptes_verifies").select("user_id"),
    // Rattachements proposés en attente (lot 2) : file « Propositions ».
    lirePropositions(),
  ]);
  const tous = (artistesData ?? []) as LigneArtiste[];
  const verifies = new Set((verifiesData ?? []).map((v) => v.user_id as string));

  const aValider = tous.filter((a) => a.statut === "en_validation" || (a.statut === "valide" && a.nom_scene_demande));
  const compte = {
    "": aValider.length,
    propositions: enAttente.length,
    valide: tous.filter((a) => a.statut === "valide").length,
    refuse: tous.filter((a) => a.statut === "refuse").length,
  };

  // Profils des demandeurs et des labels (téléphone : service_role uniquement).
  const idsProfils = Array.from(new Set(tous.flatMap((a) => [a.cree_par, a.label_id]).filter((x): x is string => !!x)));
  const { data: profilsData } = idsProfils.length
    ? await supabaseAdmin.from("profiles").select("id, nom, nom_public, telephone").in("id", idsProfils)
    : { data: [] as { id: string; nom: string; nom_public: string | null; telephone: string | null }[] };
  const profils = new Map((profilsData ?? []).map((p) => [p.id, p]));
  const nomProfil = (id: string | null) => {
    const p = id ? profils.get(id) : undefined;
    return p ? p.nom_public || p.nom : "—";
  };

  let demandes: DemandeArtiste[] = [];
  if (!filtre.cle) {
    const emails = await Promise.all(aValider.map((a) => (a.cree_par ? emailUtilisateur(a.cree_par) : Promise.resolve(null))));
    const enLigne = tous.filter((a) => a.statut === "valide");
    demandes = aValider.map((a, i) => {
      const renommage = a.statut === "valide";
      const nomCompare = norm(renommage ? a.nom_scene_demande! : a.nom_scene);
      const p = a.cree_par ? profils.get(a.cree_par) : undefined;
      return {
        id: a.id,
        genre: renommage ? "renommage" : "creation",
        nom: a.nom_scene,
        nomDemande: a.nom_scene_demande,
        type: a.type_demande,
        label: a.label_id ? nomProfil(a.label_id) : null,
        bio: a.bio ?? "",
        photo: a.photo_url,
        liens: RESEAUX.filter((r) => a.liens?.[r.cle]).map((r) => ({ libelle: r.libelle, url: a.liens![r.cle]! })),
        soumis: depuis(renommage ? a.updated_at : (a.soumis_le ?? a.updated_at)),
        demandeur: {
          nomAffiche: p ? p.nom_public || p.nom : "Compte supprimé",
          nomPerso: p?.nom ?? "—",
          email: emails[i],
          tel: p?.telephone ? formaterNumero(p.telephone) : null,
          whatsapp: a.whatsapp_contact,
          verifie: a.cree_par ? verifies.has(a.cree_par) : false,
        },
        homonymes: enLigne.filter((b) => b.id !== a.id && norm(b.nom_scene) === nomCompare).map((b) => b.nom_scene),
      };
    });
  }
  // File des propositions : coordonnées de l'organisateur et des décideurs (téléphone : service_role uniquement).
  let propositions: PropositionAdmin[] = [];
  if (filtre.cle === "propositions" && enAttente.length) {
    const ids = Array.from(new Set(enAttente.flatMap((p) => [p.organisateurId, ...p.decideurs.map((d) => d.id)])));
    const [{ data: profilsProp }, emails] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nom, nom_public, telephone").in("id", ids),
      Promise.all(ids.map((id) => emailUtilisateur(id))),
    ]);
    const parId = new Map((profilsProp ?? []).map((p) => [p.id as string, p]));
    const emailDe = new Map(ids.map((id, i) => [id, emails[i]]));
    const contact = (id: string, role: string): Contact => {
      const p = parId.get(id);
      return { nom: p ? p.nom_public || p.nom : "Compte supprimé", role, email: emailDe.get(id) ?? null, tel: p?.telephone ? formaterNumero(p.telephone) : null };
    };
    const ROLES = { label: "label", artiste: "compte de l'artiste", createur: "a créé la page" };
    propositions = enAttente.map((p) => ({
      cle: p.cle,
      eventId: p.eventId,
      artisteId: p.artisteId,
      artiste: p.artiste,
      photo: p.photo,
      titre: p.titre,
      lienEvenement: p.statutEvenement === "publie" ? `/evenement/${p.slug}` : null,
      quand: formatPlageDates(p.debut, p.fin, { avecAnnee: true }),
      ou: `${p.lieu}, ${p.ville}`,
      depuis: depuis(p.proposeLe),
      jours: Math.floor((Date.now() - new Date(p.proposeLe).getTime()) / 86_400_000),
      organisateur: contact(p.organisateurId, "organisateur"),
      decideurs: p.decideurs.map((d) => contact(d.id, ROLES[d.role])),
    }));
  }
  const liste = filtre.cle && filtre.cle !== "propositions" ? tous.filter((a) => a.statut === filtre.cle) : [];

  return (
    <Coquille nav={NAV_ADMIN} actif="artistes" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Artistes</h1>
          <p className={s.sousTitre}>Pages artistes à vérifier : contacte le demandeur pour ses pièces, puis valide ou refuse.</p>
        </div>
      </div>

      <div className={s.puces} role="group" aria-label="Filtrer" style={{ marginBottom: 16 }}>
        {FILTRES.map((f) => (
          <Link
            key={f.cle || "attente"}
            href={f.cle ? `/admin/artistes?filtre=${f.cle}` : "/admin/artistes"}
            className={`${s.puce} ${f.cle === filtre.cle ? s.puceOn : ""}`}
            aria-current={f.cle === filtre.cle ? "true" : undefined}
          >
            {f.libelle} <span style={{ opacity: 0.6 }}>{compte[f.cle]}</span>
          </Link>
        ))}
      </div>

      {!filtre.cle ? (
        demandes.length === 0 ? (
          <div className={s.vide}>
            <Icon name="check" size={32} />
            <p className={s.videTitre}>Aucune demande en attente</p>
            <p className={s.videTexte}>Les nouvelles pages artistes et les changements de nom à vérifier apparaîtront ici.</p>
          </div>
        ) : (
          <ValidationArtistes demandes={demandes} />
        )
      ) : filtre.cle === "propositions" ? (
        // Toujours monté, même file vide : la confirmation de la dernière décision reste affichée après le rafraîchissement.
        <PropositionsArtistes propositions={propositions} />
      ) : liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name="users" size={32} />
          <p className={s.videTitre}>{filtre.cle === "valide" ? "Aucun artiste en ligne" : "Aucun artiste refusé"}</p>
        </div>
      ) : (
        <ul className={s.pile} style={{ gap: 8 }}>
          {liste.map((a) => (
            <li key={a.id} className={`${s.carte} ${s.carteRangee}`}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", minWidth: 0 }}>
                <div className={s.avatarArtiste} aria-hidden="true">
                  {a.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.photo_url} alt="" />
                  ) : (
                    <span>{initialesArtiste(a.nom_scene)}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className={s.carteTitre}>{a.nom_scene}</p>
                  <p className={s.carteMeta}>
                    {a.type_demande === "auto_produit" ? "Auto-produit" : `Label ${nomProfil(a.label_id)}`} · demandé par {nomProfil(a.cree_par)}
                    {a.valide_le && a.statut === "valide" ? ` · en ligne depuis le ${dateAnnee(a.valide_le)}` : ""}
                  </p>
                  {a.statut === "refuse" && <p className={s.carteMeta}>Motif : {a.motif_refus || "aucun"}</p>}
                </div>
              </div>
              {a.statut === "valide" && (
                <Link href={`/artiste/${a.slug}`} className={`${s.btn} ${s.btnGris}`}>
                  <Icon name="eye" size={16} /> Voir la page
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Coquille>
  );
}
