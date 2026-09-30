import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import Deconnexion from "@/components/v2/Deconnexion";
import { NAV_ADMIN } from "@/components/v2/navAdmin";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Plus — Administration — XwézanEvent",
};

/**
 * « Plus » (barre basse mobile) : rubriques secondaires de l'admin, reprises
 * de la preview. Sur desktop, la colonne latérale les montre déjà.
 */
export default async function AdminPlus() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/admin/plus");

  const { data: profil } = await supabase.from("profiles").select("role, nom").eq("id", user.id).single();
  if (!profil || profil.role !== "admin") redirect("/");

  const secondaires = NAV_ADMIN.entrees.filter((e) => e.secondaire);

  return (
    <Coquille nav={NAV_ADMIN} actif="plus" compte={{ nom: profil.nom || user.email || "Admin", email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Plus</h1>
          <p className={s.sousTitre}>Les autres rubriques de l&apos;administration.</p>
        </div>
      </div>
      <ul className={s.pile} style={{ gap: 8 }}>
        {secondaires.map((e) => (
          <li key={e.cle} className={`${s.carte} ${s.carteLien}`}>
            <div className={s.carteHaut} style={{ alignItems: "center" }}>
              <p className={s.carteTitre} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name={e.icone} size={24} />
                <Link href={e.href}>{e.libelle}</Link>
              </p>
              <Icon name="chevron-right" />
            </div>
          </li>
        ))}
      </ul>
      <ul className={s.pile} style={{ gap: 8, marginTop: 24 }}>
        <li>
          <Link href="/" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ width: "100%" }}>
            <Icon name="eye" /> Voir le site
          </Link>
        </li>
        <li>
          <Deconnexion className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} style={{ width: "100%" }} />
        </li>
      </ul>
    </Coquille>
  );
}
