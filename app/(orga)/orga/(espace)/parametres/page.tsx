import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import Coquille from "@/components/v2/Coquille";
import Icon from "@/components/v2/Icon";
import Deconnexion from "@/components/v2/Deconnexion";
import NomPublic from "@/components/v2/orga/NomPublic";
import { NAV_ORGA } from "@/components/v2/navOrga";
import s from "@/components/v2/espace.module.css";
import { majNomPublic } from "./actions";

export const metadata: Metadata = {
  title: "Paramètres — XwézanEvent",
};

/**
 * Paramètres (V2), repris de la preview : même périmètre qu'en prod (nom
 * public, action serveur `majNomPublic`), plus le compte en lecture seule et
 * la déconnexion, que la barre basse mobile n'expose pas.
 */
export default async function OrgaParametres({ searchParams }: { searchParams: { erreur?: string; maj?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/parametres");

  // Client de session : la policy RLS "Users can read own full profile" suffit.
  const { data: profil } = await supabase.from("profiles").select("nom, nom_public").eq("id", user.id).maybeSingle();

  const nomPerso = profil?.nom || user.email || "";
  const nomPublic = profil?.nom_public ?? "";

  return (
    <Coquille nav={NAV_ORGA} actif="parametres" compte={{ nom: nomPublic || nomPerso, email: user.email ?? "" }}>
      <div className={s.entete}>
        <div>
          <h1 className={s.titre}>Paramètres</h1>
          <p className={s.sousTitre}>Ce que les acheteurs voient de toi, et ton compte.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, maxWidth: 560 }}>
        {!nomPublic && (
          <p className={s.alerte} style={{ marginBottom: 0 }}>
            <Icon name="info" />
            <span>Tes événements affichent pour l&apos;instant ton nom personnel. Choisis un nom public pour ta structure.</span>
          </p>
        )}

        <section className={s.bloc} aria-labelledby="titre-nom-public">
          <div className={s.blocTete}>
            <Icon name="eye" size={20} />
            <h2 id="titre-nom-public" className={s.blocTitre}>
              Nom public
            </h2>
          </div>
          {/* key : repart de la valeur enregistrée après chaque retour de l'action serveur. */}
          <NomPublic
            key={`${nomPublic}|${searchParams.maj ?? ""}|${searchParams.erreur ?? ""}`}
            action={majNomPublic}
            nomPerso={nomPerso}
            initial={nomPublic}
            enregistre={searchParams.maj === "1"}
            erreur={searchParams.erreur === "1"}
          />
        </section>

        <section className={s.bloc} aria-labelledby="titre-compte">
          <div className={s.blocTete}>
            <Icon name="settings" size={20} />
            <h2 id="titre-compte" className={s.blocTitre}>
              Compte
            </h2>
          </div>
          <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
            <dt>Nom personnel</dt>
            <dd>{nomPerso}</dd>
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
          </dl>
          <p className={s.aide}>
            Ton nom personnel n&apos;est jamais affiché publiquement. Pour le changer, ou changer d&apos;e-mail, écris à{" "}
            <a href="mailto:contact@xwezan.com" style={{ textDecoration: "underline" }}>
              contact@xwezan.com
            </a>
            .
          </p>
          <Deconnexion className={`${s.btn} ${s.btnGris} ${s.btnGrand}`} />
        </section>
      </div>
    </Coquille>
  );
}
