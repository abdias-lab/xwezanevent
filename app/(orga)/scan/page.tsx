import { redirect } from "next/navigation";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ScannerClient from "./ScannerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scanner les billets — XwézanEvent",
};

export default async function ScanPage() {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/scan");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["organisateur", "admin"].includes(profile.role)) {
    redirect("/");
  }

  return <ScannerClient />;
}
