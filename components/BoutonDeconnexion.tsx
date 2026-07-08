"use client";

import { useRouter } from "next/navigation";
import { creerClientNavigateur } from "@/lib/supabase-browser";

export default function BoutonDeconnexion() {
  const router = useRouter();

  async function deconnexion() {
    const supabase = creerClientNavigateur();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" className="connexion lien-deconnexion" onClick={deconnexion}>
      Déconnexion
    </button>
  );
}
