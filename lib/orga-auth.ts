import "server-only";
import { NextResponse } from "next/server";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

interface ProprietaireAutorise {
  userId: string;
  titre: string;
  erreur: null;
}
interface ProprietaireRefuse {
  userId: null;
  titre: null;
  erreur: NextResponse;
}

/**
 * Vérifie côté serveur que l'appelant est connecté ET est l'organisateur de
 * l'événement `eventId` (jamais confiance au front). À appeler en tout
 * début de chaque route API organisateur agissant sur un événement précis.
 */
export async function verifierProprietaireEvenement(
  eventId: string
): Promise<ProprietaireAutorise | ProprietaireRefuse> {
  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      titre: null,
      erreur: NextResponse.json({ error: "Connexion requise" }, { status: 401 }),
    };
  }

  const { data: event } = await supabaseAdmin
    .from("events")
    .select("organisateur_id, titre")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) {
    return {
      userId: null,
      titre: null,
      erreur: NextResponse.json({ error: "Événement introuvable" }, { status: 404 }),
    };
  }

  if (event.organisateur_id !== user.id) {
    return {
      userId: null,
      titre: null,
      erreur: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    };
  }

  return { userId: user.id, titre: event.titre, erreur: null };
}
