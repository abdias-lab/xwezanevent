"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { creerClientServeur } from "@/lib/supabase-server";
import { desabonner } from "@/lib/abonnements";

/** « Se désabonner » depuis Mes abonnements (/compte) : seulement les abonnements du compte connecté. */
export async function seDesabonner(formData: FormData) {
  const {
    data: { user },
  } = await creerClientServeur().auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");
  await desabonner(user.id, String(formData.get("artiste") ?? ""));
  revalidatePath("/compte");
  redirect("/compte?desabonne=1#abonnements");
}
