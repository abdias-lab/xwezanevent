import Link from "next/link";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import Logo from "@/components/Logo";
import { creerClientServeur } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { majNomPublic } from "./actions";

export const metadata: Metadata = {
  title: "Paramètres — XwézanEvent",
};

export default async function OrgaParametres({
  searchParams,
}: {
  searchParams: { erreur?: string; maj?: string };
}) {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/orga/parametres");

  // Client de session (pas supabaseAdmin) : la policy RLS "Users can read
  // own full profile" (auth.uid() = id) suffit pour lire sa propre ligne.
  const { data: profil } = await supabase
    .from("profiles")
    .select("nom, nom_public")
    .eq("id", user.id)
    .maybeSingle();

  const nom = profil?.nom ?? user.email ?? "";
  const nomPublic = profil?.nom_public ?? "";

  return (
    <div className="app">
      <aside className="lateral">
        <Logo />
        <p className="role">Organisateur</p>

        <p className="groupe">Principal</p>
        <Link className="item" href="/orga">📊 Vue d&apos;ensemble</Link>
        <Link className="item" href="/evenements">🎟️ Le catalogue</Link>
        <Link className="btn btn-or" href="/creer" style={{ marginTop: 22 }}>
          + Créer un événement
        </Link>
        <Link className="item" href="/scan" style={{ marginTop: 8 }}>📷 Scanner les billets</Link>
        <Link className="item" href="/orga/reversements" style={{ marginTop: 8 }}>🏦 Mes reversements</Link>
        <Link className="item actif" href="/orga/parametres" style={{ marginTop: 8 }}>⚙️ Paramètres</Link>

        <div className="bas">
          <BoutonDeconnexion />
        </div>
      </aside>

      <main className="principal">
        <div className="entete-app">
          <div>
            <h1>Paramètres</h1>
            <p className="sous">Nom affiché publiquement sur tes événements</p>
          </div>
          <Link className="btn btn-ghost" href="/orga">
            ← Vue d&apos;ensemble
          </Link>
        </div>

        <div className="tableau-panneau" style={{ padding: 24, maxWidth: 480 }}>
          {searchParams.maj === "1" && <p className="alerte-info">Nom public enregistré.</p>}
          {searchParams.erreur === "1" && (
            <p className="alerte-erreur">Une erreur est survenue, réessaie.</p>
          )}

          <p style={{ color: "var(--texte2)", fontSize: "0.85rem", marginBottom: 18 }}>
            Ton nom personnel (jamais affiché publiquement) : <strong>{nom}</strong>
          </p>

          <form action={majNomPublic}>
            <div className="champ-bloc">
              <label htmlFor="nom_public">
                Nom public <small>(affiché sur la page de chacun de tes événements)</small>
              </label>
              <input
                id="nom_public"
                name="nom_public"
                type="text"
                defaultValue={nomPublic}
                placeholder={nom}
                maxLength={80}
              />
              <small className="note-virement">
                Laisse vide pour afficher ton nom personnel par défaut.
              </small>
            </div>
            <button className="btn btn-or" type="submit">
              Enregistrer
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
