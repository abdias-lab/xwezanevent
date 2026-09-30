import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dateDisponibilitePayout, payoutDisponible } from "@/lib/payouts";

export type StatutEvenement = "publie" | "en_validation" | "brouillon" | "termine" | "refuse" | "annule";

export interface EvenementOrga {
  id: string;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  date_reference_virement: string;
  ville: string;
  statut: StatutEvenement;
  taux_commission: number;
  pays_code: string;
  ticket_types: { prix: number; quantite_totale: number; quantite_vendue: number }[];
}

export interface LigneOrga {
  e: EvenementOrga;
  vendus: number;
  capacite: number;
  brut: number;
  net: number;
  dejaDemande: number;
  /** Net − virements demandés ou traités ; 0 pour un événement annulé ou refusé. */
  disponible: number;
  /** J+3 atteint (lib/payouts.ts). */
  peutDemander: boolean;
  /** AAAA-MM-JJ à partir duquel le virement est possible. */
  disponibleLe: string;
}

const STATUTS_SANS_VIREMENT = new Set(["annule", "refuse"]);

/**
 * Chiffres de l'espace organisateur, partagés par le tableau de bord (/orga)
 * et Mes reversements, pour qu'ils ne divergent jamais. Mêmes règles que la
 * prod : brut sur les billets vendus, net au taux de chaque événement,
 * disponible = net − virements demandés ou traités, J+3.
 * `supabase` : client de session (RLS : l'organisateur ne lit que ses lignes).
 */
export async function chiffresOrganisateur(supabase: SupabaseClient, organisateurId: string) {
  const [{ data }, { data: payoutsData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, titre, date_debut, date_fin, date_reference_virement, ville, statut, taux_commission, pays_code, ticket_types(prix, quantite_totale, quantite_vendue)")
      .eq("organisateur_id", organisateurId)
      .order("date_debut", { ascending: false }),
    supabase.from("payouts").select("event_id, montant, statut").eq("organisateur_id", organisateurId).in("statut", ["demande", "traite"]),
  ]);

  const events = (data as unknown as EvenementOrga[]) ?? [];
  const demande = new Map<string, number>();
  for (const p of (payoutsData ?? []) as { event_id: string; montant: number }[]) demande.set(p.event_id, (demande.get(p.event_id) ?? 0) + p.montant);

  const lignes: LigneOrga[] = events.map((e) => {
    const vendus = e.ticket_types.reduce((n, t) => n + t.quantite_vendue, 0);
    const capacite = e.ticket_types.reduce((n, t) => n + t.quantite_totale, 0);
    const brut = e.ticket_types.reduce((n, t) => n + t.prix * t.quantite_vendue, 0);
    const net = Math.round(brut * (1 - e.taux_commission));
    const dejaDemande = demande.get(e.id) ?? 0;
    const disponible = STATUTS_SANS_VIREMENT.has(e.statut) ? 0 : Math.max(0, net - dejaDemande);
    return { e, vendus, capacite, brut, net, dejaDemande, disponible, peutDemander: payoutDisponible(e), disponibleLe: dateDisponibilitePayout(e) };
  });

  const totaux = {
    net: lignes.reduce((n, l) => n + l.net, 0),
    brut: lignes.reduce((n, l) => n + l.brut, 0),
    vendus: lignes.reduce((n, l) => n + l.vendus, 0),
    capacite: lignes.reduce((n, l) => n + l.capacite, 0),
    publies: events.filter((e) => e.statut === "publie").length,
    /** Disponible maintenant (J+3 atteint). */
    disponible: lignes.reduce((n, l) => n + (l.peutDemander ? l.disponible : 0), 0),
  };

  return { events, lignes, totaux };
}
