import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ORGA } from "@/components/v2/navOrga";
import FormulaireArtiste from "@/components/v2/orga/artistes/FormulaireArtiste";
import s from "@/components/v2/espace.module.css";
import { COLONNES_ARTISTE, estVerifie, gere, type Artiste } from "@/lib/artistes";
import { modifierArtiste } from "../actions";

export const metadata: Metadata = { title: "Modifier un artiste — XwézanEvent" };

/**
 * Modification d'un artiste (V2), reprise de la preview
 * (v2/orga/artistes/[id]) : seulement pour un artiste que le compte gère.
 * Bio, photo, réseaux libres ; nom de scène en vérification pour un compte
 * non vérifié dont la page est en ligne.
 */
export default async function ModifierArtiste({ params }: { params: { id: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?redirect=/orga/artistes/${params.id}`);

  const [{ data }, { data: profil }, verifie] = await Promise.all([
    supabaseAdmin.from("artistes").select(COLONNES_ARTISTE).eq("id", params.id).maybeSingle(),
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
    estVerifie(user.id),
  ]);
  const a = data as Artiste | null;
  if (!a || !gere(a, user.id)) notFound();

  return (
    <Coquille nav={NAV_ORGA} actif="artistes" compte={{ nom: profil?.nom_public || profil?.nom || user.email || "", email: user.email ?? "" }}>
      <Link href="/orga/artistes" className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <Icon name="back" size={16} /> Mes artistes
      </Link>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>{a.nom_scene}</h1>
          <p className={s.sousTitre}>{a.statut === "valide" ? "Les modifications sont visibles tout de suite sur sa page." : "Sa page n'est pas encore en ligne."}</p>
        </div>
      </div>
      {a.statut === "refuse" && a.motif_refus && (
        <p className={`${s.alerte} ${s.alerteDanger}`}>
          <Icon name="alert" />
          <span>Demande refusée : {a.motif_refus} Corrige et renvoie-la, elle repassera en vérification.</span>
        </p>
      )}
      <FormulaireArtiste
        action={modifierArtiste}
        verifie={verifie}
        peutMoiMeme
        artiste={{
          id: a.id,
          nom: a.nom_scene,
          nomDemande: a.nom_scene_demande,
          bio: a.bio ?? "",
          photo: a.photo_url,
          liens: a.liens ?? {},
          type: a.type_demande,
          statut: a.statut,
        }}
      />
    </Coquille>
  );
}
