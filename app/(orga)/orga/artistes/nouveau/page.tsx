import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import { NAV_ORGA } from "@/components/v2/navOrga";
import FormulaireArtiste from "@/components/v2/orga/artistes/FormulaireArtiste";
import s from "@/components/v2/espace.module.css";
import { estVerifie } from "@/lib/artistes";
import { creerArtiste } from "../actions";

export const metadata: Metadata = { title: "Ajouter un artiste — XwézanEvent" };

/**
 * Demande d'un nouvel artiste (V2), reprise de la preview
 * (v2/orga/artistes/nouveau). Compte vérifié : publication immédiate.
 * « Moi-même » indisponible si le compte a déjà sa propre page artiste.
 */
export default async function NouvelArtiste() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/artistes/nouveau");

  const [{ data: profil }, verifie, { data: pagePerso }] = await Promise.all([
    supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle(),
    estVerifie(user.id),
    supabaseAdmin.from("artistes").select("id").eq("compte_id", user.id).maybeSingle(),
  ]);

  return (
    <Coquille nav={NAV_ORGA} actif="artistes" compte={{ nom: profil?.nom_public || profil?.nom || user.email || "", email: user.email ?? "" }}>
      <Link href="/orga/artistes" className={s.note} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <Icon name="back" size={16} /> Mes artistes
      </Link>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Ajouter un artiste</h1>
          <p className={s.sousTitre}>Sa page publique : nom, photo, bio, réseaux, et toutes ses dates au même endroit.</p>
        </div>
      </div>
      <FormulaireArtiste action={creerArtiste} verifie={verifie} peutMoiMeme={!pagePerso} />
    </Coquille>
  );
}
