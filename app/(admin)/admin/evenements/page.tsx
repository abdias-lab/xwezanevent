import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { emailUtilisateur } from "@/lib/email";
import { aujourdhuiPortoNovo } from "@/lib/date";
import { accrocheOuRepli } from "@/lib/events";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import { dateCourte, depuis, joursDepuis, montant, nombre } from "@/components/v2/format";
import { STATUTS, type Statut } from "@/components/v2/statuts";
import Validation, { type Controle, type EvenementAValider } from "@/components/v2/admin/Validation";
import ListeGestion, { type EvenementGere } from "@/components/v2/admin/ListeGestion";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Événements — Administration — XwézanEvent",
};

const FILTRES: { cle: string; libelle: string; statut: Statut }[] = [
  { cle: "attente", libelle: "À valider", statut: "en_validation" },
  { cle: "publie", libelle: "En vente", statut: "publie" },
  { cle: "termine", libelle: "Terminés", statut: "termine" },
  { cle: "refuse", libelle: "Refusés", statut: "refuse" },
  { cle: "annule", libelle: "Annulés", statut: "annule" },
  // Ajout du 2026-09-28, absent de la preview d'origine (reporté dedans) :
  // sans cette puce, les brouillons n'étaient visibles nulle part côté admin.
  { cle: "brouillon", libelle: "Brouillons", statut: "brouillon" },
];

interface EventLigne {
  id: string;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  heure: string | null;
  lieu: string;
  ville: string;
  description: string | null;
  statut: Statut;
  soumis_le: string | null;
  affiche_url: string | null;
  mis_en_avant: boolean;
  accroche: string | null;
  est_demo: boolean;
  motif_refus: string | null;
  organisateur_id: string;
  organisateur: { nom: string; nom_public: string | null; created_at: string } | null;
  ticket_types: { nom: string; prix: number; quantite_totale: number; quantite_vendue: number }[];
  event_categories: { categorie: string; ordre: number }[];
  event_images: { url: string; principale: boolean }[];
}

/** Contrôles automatiques proposés à l'admin (et motifs de refus prêts à l'emploi), repris de la preview. */
function controles(e: EventLigne, nbEvtsOrga: number, aujourdhui: string): Controle[] {
  const out: Controle[] = [];
  const description = e.description ?? "";
  if (!e.event_images.length && !e.affiche_url)
    out.push({ texte: "Pas d'affiche : la carte affichera les initiales du titre.", motif: "Ajoute une affiche à ton événement." });
  if (description.length < 80)
    out.push({ texte: `Description très courte (${description.length} caractères).`, motif: "Complète la description : programme, artistes, infos pratiques." });
  if (/préciser/i.test(e.lieu)) out.push({ texte: "Lieu non précisé.", motif: "Indique le lieu exact de l'événement." });
  for (const t of e.ticket_types)
    if (t.prix >= 50000)
      out.push({ texte: `Tarif élevé : ${t.nom} à ${montant(t.prix)}. Vérifier qu'il ne s'agit pas d'une faute de frappe.`, motif: `Vérifie le prix du tarif « ${t.nom} ».` });
  const places = e.ticket_types.reduce((n, t) => n + t.quantite_totale, 0);
  if (places >= 1000) out.push({ texte: `Capacité importante : ${nombre(places)} places. Cohérente avec le lieu ?`, motif: "Vérifie la capacité annoncée par rapport au lieu." });
  if (e.organisateur && joursDepuis(e.organisateur.created_at) <= 7 && nbEvtsOrga === 1)
    out.push({ texte: `Organisateur inscrit ${depuis(e.organisateur.created_at)}, premier événement.`, motif: "Réponds-nous à contact@xwezan.com pour présenter ton organisation." });
  const dans = Math.round((Date.parse(`${e.date_debut}T00:00:00Z`) - Date.parse(`${aujourdhui}T00:00:00Z`)) / 86400000);
  if (dans <= 14) out.push({ texte: `L'événement a lieu dans ${dans} jours : la vente ne dure que jusque-là.`, motif: "" });
  return out.filter((c, i, l) => l.findIndex((x) => x.texte === c.texte) === i);
}

export default async function AdminEvenements({ searchParams }: { searchParams: { statut?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/evenements");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  // Filet de sécurité si pg_cron n'est pas disponible/activé sur ce projet.
  await supabaseAdmin.rpc("cloturer_evenements_passes");

  const filtre = FILTRES.find((f) => f.cle === searchParams.statut) ?? FILTRES[0];
  const aujourdhui = aujourdhuiPortoNovo();

  const { data } = await supabase
    .from("events")
    .select(
      "id, titre, date_debut, date_fin, heure, lieu, ville, description, statut, soumis_le, affiche_url, mis_en_avant, accroche, est_demo, motif_refus, organisateur_id, organisateur:profiles!organisateur_id(nom, nom_public, created_at), ticket_types(nom, prix, quantite_totale, quantite_vendue), event_categories(categorie, ordre), event_images(url, principale)"
    )
    .order("soumis_le", { ascending: true, nullsFirst: false });

  const tous = (data as unknown as EventLigne[]) ?? [];
  const liste = tous.filter((e) => e.statut === filtre.statut);
  const compte = (st: Statut) => tous.filter((e) => e.statut === st).length;
  // Comme l'accueil (lib/events.ts) : un événement vitrine/démo n'y apparaît jamais, même coché.
  const nbALaUne = tous.filter((e) => e.statut === "publie" && e.mis_en_avant && !e.est_demo).length;
  const orgaAffiche = (e: EventLigne) => e.organisateur?.nom_public || e.organisateur?.nom || "—";

  let aValider: EvenementAValider[] = [];
  let geres: EvenementGere[] = [];
  if (filtre.cle === "attente") {
    // E-mail de l'organisateur : dans auth.users, lu via service_role (lib/email.ts).
    const emails = await Promise.all(liste.map((e) => emailUtilisateur(e.organisateur_id)));
    aValider = liste.map((e, i) => {
      const image = e.event_images.find((im) => im.principale)?.url ?? e.event_images[0]?.url ?? e.affiche_url;
      return {
        id: e.id,
        titre: e.titre,
        orgaAffiche: orgaAffiche(e),
        orgaPerso: e.organisateur?.nom ?? "—",
        orgaEmail: emails[i] ?? "—",
        debut: e.date_debut,
        fin: e.date_fin,
        heure: e.heure ? e.heure.slice(0, 5) : "heure à préciser",
        lieu: e.lieu,
        ville: e.ville,
        soumis: depuis(e.soumis_le ?? new Date().toISOString()),
        categories: [...e.event_categories].sort((a, b) => a.ordre - b.ordre).map((c) => c.categorie),
        description: e.description ?? "",
        tarifs: e.ticket_types.map((t) => ({ nom: t.nom, prix: t.prix, total: t.quantite_totale })),
        image,
        controles: controles(e, tous.filter((x) => x.organisateur_id === e.organisateur_id).length, aujourdhui)
          .map((c) => ({ ...c, motif: c.motif || c.texte }))
          .filter((c) => c.motif),
      };
    });
  } else {
    geres = liste.map((e) => ({
      id: e.id,
      titre: e.titre,
      quand: `${dateCourte(e.date_debut, e.date_fin)} · ${e.ville}`,
      motifRefus: e.statut === "refuse" ? e.motif_refus : null,
      statut: e.statut,
      organisateur: orgaAffiche(e),
      vendus: e.ticket_types.reduce((n, t) => n + t.quantite_vendue, 0),
      capacite: e.ticket_types.reduce((n, t) => n + t.quantite_totale, 0),
      brut: e.ticket_types.reduce((n, t) => n + t.prix * t.quantite_vendue, 0),
      aLaUne: e.mis_en_avant,
      accroche: e.accroche,
      accrocheRepli: accrocheOuRepli(null, e.description),
      apercu: {
        titre: e.titre,
        categorie: [...e.event_categories].sort((a, b) => a.ordre - b.ordre)[0]?.categorie ?? "Événement",
        image: e.affiche_url,
        debut: e.date_debut,
        fin: e.date_fin && e.date_fin !== e.date_debut ? e.date_fin : undefined,
        heure: e.heure ? e.heure.slice(0, 5) : null,
      },
    }));
  }

  return (
    <Coquille nav={NAV_ADMIN} actif="evenements" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>{filtre.cle === "attente" ? "Validation des événements" : "Événements"}</h1>
          <p className={s.sousTitre}>
            {filtre.cle === "attente"
              ? "Chaque événement soumis attend ton accord avant d'être mis en vente."
              : "Mise à la une, annulation et suppression des événements."}
          </p>
        </div>
      </div>

      <div className={s.puces} role="group" aria-label="Filtrer par statut" style={{ marginBottom: 16 }}>
        {FILTRES.map((f) => (
          <Link
            key={f.cle}
            href={f.cle === "attente" ? "/admin/evenements" : `/admin/evenements?statut=${f.cle}`}
            className={`${s.puce} ${f.cle === filtre.cle ? s.puceOn : ""}`}
            aria-current={f.cle === filtre.cle ? "page" : undefined}
          >
            {f.libelle}
            <span style={{ opacity: 0.55, fontWeight: 500 }}>{compte(f.statut)}</span>
          </Link>
        ))}
      </div>

      {liste.length === 0 ? (
        <div className={s.vide}>
          <Icon name={filtre.cle === "attente" ? "check" : "calendar"} size={32} />
          <p className={s.videTitre}>{filtre.cle === "attente" ? "Aucun événement à valider" : `Aucun événement « ${filtre.libelle.toLowerCase()} »`}</p>
          <p className={s.videTexte}>
            {filtre.cle === "attente" ? "Les nouveaux événements soumis par les organisateurs apparaîtront ici." : "Rien à afficher pour ce statut."}
          </p>
        </div>
      ) : filtre.cle === "attente" ? (
        <Validation evenements={aValider} />
      ) : (
        <ListeGestion evenements={geres} />
      )}

      <p className={s.note} style={{ marginTop: 16 }}>
        Statut affiché : {STATUTS[filtre.statut]}. {filtre.cle === "publie" ? `${nbALaUne} à la une sur l'accueil.` : ""}
      </p>
    </Coquille>
  );
}
