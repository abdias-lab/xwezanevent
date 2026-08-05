"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { COOKIE_PAYS } from "@/lib/pays";

/**
 * Change le pays de navigation (cookie, 1 an) — appelé par
 * components/SelecteurPays.tsx. Change uniquement le CONTEXTE de
 * filtrage du catalogue public, jamais le pays d'un événement individuel
 * (events.pays_code, figé à la création — voir components/FormulaireEdition.tsx).
 *
 * Revalide `code` contre `pays.actif` avant d'écrire le cookie (même
 * principe que la validation serveur du formulaire de création) : le
 * sélecteur ne propose que des pays actifs, mais le formulaire posté
 * n'est jamais source de vérité.
 *
 * `chemin` (page d'où vient le changement) doit commencer par "/" —
 * même garde anti-redirection-ouverte que app/(public)/connexion/page.tsx.
 */
export async function changerPays(formData: FormData) {
  const code = String(formData.get("pays_code") || "").trim();
  const chemin = String(formData.get("chemin") || "/");

  const { data: paysValide } = await supabaseAdmin
    .from("pays")
    .select("code")
    .eq("code", code)
    .eq("actif", true)
    .maybeSingle();

  if (paysValide) {
    cookies().set(COOKIE_PAYS, code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  redirect(chemin.startsWith("/") ? chemin : "/");
}
