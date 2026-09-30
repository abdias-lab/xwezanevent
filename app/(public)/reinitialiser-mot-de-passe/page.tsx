import Link from "next/link";
import type { Metadata } from "next";
import { creerClientServeur } from "@/lib/supabase-server";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header, Footer } from "@/components/v2/public/Chrome";
import Icon from "@/components/v2/Icon";
import Reinit from "@/components/v2/compte/Reinit";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Nouveau mot de passe — XwézanEvent",
};

/**
 * Nouveau mot de passe (V2), repris de la preview (v2/reinitialiser-mot-de-passe).
 * La session est déjà établie (ou non) AVANT que cette page ne se rende :
 * /auth/confirm a échangé le token_hash du lien e-mail contre une session
 * posée en cookies côté serveur, puis a redirigé ici (?erreur=lien_invalide
 * en cas d'échec). Il suffit de vérifier cette session.
 */
export default async function ReinitialiserMotDePasse({ searchParams }: { searchParams: { erreur?: string } }) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const lienValide = !!user && searchParams.erreur !== "lien_invalide";

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont}>
        <div className={s.colonneEcran}>
          <h1 className={v.h1}>
            Nouveau <em>mot de passe.</em>
          </h1>
          {!lienValide ? (
            <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
              <p className={`${s.alerte} ${s.alerteDanger}`} role="alert" style={{ marginBottom: 0 }}>
                <Icon name="alert" />
                <span>Ce lien est invalide ou a expiré. Chaque lien ne sert qu&apos;une fois : demande-en un nouveau.</span>
              </p>
              <Link href="/mot-de-passe-oublie" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                Demander un nouveau lien
              </Link>
            </div>
          ) : (
            <>
              <p className={v.sous} style={{ margin: "12px 0 24px" }}>
                Choisis un mot de passe d&apos;au moins 8 caractères.
              </p>
              <Reinit />
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
