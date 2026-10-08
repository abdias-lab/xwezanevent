import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { abonnementParJeton, desabonnerParJeton } from "@/lib/abonnements";
import Icon from "@/components/v2/Icon";
import { Header, Footer } from "@/components/v2/public/Chrome";
import { POLICES_V2 } from "@/components/v2/polices";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Désabonnement — XwézanEvent", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Bouton du lien : POST, jamais de désabonnement sur un simple GET (les antivirus de messagerie ouvrent les liens). */
async function confirmer(formData: FormData) {
  "use server";
  const jeton = String(formData.get("jeton") ?? "");
  await desabonnerParJeton(jeton);
  redirect(`/desabonnement/${encodeURIComponent(jeton)}?fait=1`);
}

/**
 * Désabonnement depuis l'e-mail « nouvelle date » (design/ARTISTES.md,
 * lot 3), sans connexion : le jeton de l'abonnement suffit, un clic sur
 * « Me désabonner ». Les messageries qui gèrent List-Unsubscribe-Post
 * passent par /api/desabonnement/[jeton] (un clic natif). Page de résultat :
 * contenu centré, comme components/v2/public/PageErreur.tsx.
 */
export default async function Desabonnement({ params, searchParams }: { params: { jeton: string }; searchParams: { fait?: string } }) {
  const abonnement = await abonnementParJeton(params.jeton);
  const fait = searchParams.fait === "1" || !abonnement;

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ padding: "64px 16px 96px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }} role="status">
          <Icon name={fait ? "check" : "mail"} size={48} className={s.montantOr} />
          {fait ? (
            <>
              <h1 className={v.h1}>Désabonnement fait</h1>
              <p className={v.sous} style={{ margin: 0 }}>
                Tu ne recevras plus d&apos;e-mail pour les nouvelles dates de cet artiste.
              </p>
              <Link href="/evenements" className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                <Icon name="calendar" /> Voir les événements
              </Link>
            </>
          ) : (
            <>
              <h1 className={v.h1}>Ne plus suivre {abonnement.artiste} ?</h1>
              <p className={v.sous} style={{ margin: 0 }}>
                Tu ne recevras plus d&apos;e-mail à chaque nouvelle date de {abonnement.artiste}. Tu pourras te réabonner à tout moment depuis sa page.
              </p>
              <form action={confirmer} style={{ display: "grid", gap: 8, width: "100%", maxWidth: 320 }}>
                <input type="hidden" name="jeton" value={params.jeton} />
                <button type="submit" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                  Me désabonner
                </button>
                {abonnement.slug && (
                  <Link href={`/artiste/${abonnement.slug}`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                    Rester abonné
                  </Link>
                )}
              </form>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
