import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Coquille from "@/components/v2/Coquille";
import Scanner from "@/components/v2/scan/Scanner";
import { NAV_ORGA } from "@/components/v2/navOrga";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Scanner les billets — XwézanEvent",
};

/**
 * Scanner les billets (V2), repris de la preview : dans l'espace
 * organisateur (plus le plein écran de l'ancienne page), tous les
 * événements de l'organisateur. Réservé aux organisateurs et à l'admin.
 */
export default async function ScanPage() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/scan");

  const { data: profil } = await supabaseAdmin.from("profiles").select("role, nom, nom_public").eq("id", user.id).single();
  if (!profil || !["organisateur", "admin"].includes(profil.role)) redirect("/");

  return (
    <Coquille nav={NAV_ORGA} actif="scan" compte={{ nom: profil.nom_public || profil.nom || user.email || "organisateur", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Scanner les billets</h1>
          <p className={s.sousTitre}>Contrôle des entrées, pour tous tes événements en vente.</p>
        </div>
      </div>
      <Scanner />
    </Coquille>
  );
}
