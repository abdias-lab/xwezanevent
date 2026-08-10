import Link from "next/link";
import RetrouverBilletForm from "@/components/RetrouverBilletForm";
import PanneauMarketing from "@/components/PanneauMarketing";
import { creerClientServeur } from "@/lib/supabase-server";
import Logo from "@/components/Logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retrouver mon billet — XwézanEvent",
  description: "Retrouve rapidement ton billet pour entrer à ton événement.",
};

export default async function RetrouverBillet() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="split">
      <PanneauMarketing
        titre={
          <>
            Ton billet <span className="fete">t&apos;attend.</span>
          </>
        }
        description="Pas de panique — deux façons rapides de le retrouver avant d'entrer."
      />

      <div className="cote-form">
        <div className="boite">
          <Logo />

          <h2>Retrouver mon billet</h2>
          <p className="sous">
            Choisis l&apos;option qui te correspond, c&apos;est rapide.
          </p>

          <div className="bloc-retrouver">
            <h3>🔑 J&apos;ai un compte</h3>
            <p>
              Connecte-toi : tous tes billets t&apos;attendent dans
              « Mes billets ».
            </p>
            <Link
              className="btn btn-or btn-large"
              href={user ? "/compte" : "/connexion?redirect=/compte"}
            >
              {user ? "Voir mes billets" : "Me connecter"}
            </Link>
          </div>

          <div className="separateur-ou" role="separator">
            <span>ou</span>
          </div>

          <div className="bloc-retrouver">
            <h3>📧 Je ne retrouve plus mon email de billets</h3>
            <p>
              Indique ton adresse : si des billets y sont associés, on te
              les renvoie tout de suite.
            </p>
            <RetrouverBilletForm />
          </div>
        </div>
      </div>
    </div>
  );
}
