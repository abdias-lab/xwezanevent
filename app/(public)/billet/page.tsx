import Link from "next/link";
import RetrouverBilletForm from "@/components/RetrouverBilletForm";
import { creerClientServeur } from "@/lib/supabase-server";
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
      <div className="marque">
        <div className="applique" aria-hidden="true" />
        <div style={{ position: "relative" }}>
          <span className="eyebrow">La billetterie du Bénin</span>
          <h1>
            Ton billet <span className="fete">t&apos;attend.</span>
          </h1>
          <p>
            Pas de panique — deux façons rapides de le retrouver avant
            d&apos;entrer.
          </p>
        </div>
      </div>

      <div className="cote-form">
        <div className="boite">
          <Link className="logo" href="/">
            <span className="mark" aria-hidden="true" />
            Xwézan<em>Event</em>
          </Link>

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
