import { NextResponse, type NextRequest } from "next/server";
import { verifierProprietaireEvenement } from "@/lib/orga-auth";
import { recupererBilletsPourExport } from "@/lib/billets";
import { construireCsv } from "@/lib/csv";

const STATUT_LABEL: Record<string, string> = {
  valide: "Valide",
  utilise: "Utilisé",
  annule: "Annulé",
};

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("fr-FR", {
    timeZone: "Africa/Porto-Novo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Export CSV complet des billets d'un événement — filet de secours "tout
 * numérique lâche le jour J" : l'organisateur peut l'imprimer ou l'ouvrir
 * hors-ligne. Inclut TOUS les statuts (y compris annulés) : un billet
 * annulé invisible dans l'export serait dangereux (staff qui laisse
 * entrer quelqu'un qui ne devrait plus avoir de billet valide).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { titre, erreur } = await verifierProprietaireEvenement(params.id);
  if (erreur) return erreur;

  const lignes = await recupererBilletsPourExport(params.id);

  const csv = construireCsv(
    ["Nom acheteur", "Email", "Type de billet", "N° commande", "Statut", "Date d'achat", "Utilisé le"],
    lignes.map((l) => [
      l.acheteur_nom,
      l.acheteur_email,
      l.type_billet,
      l.reference_commande,
      STATUT_LABEL[l.statut] ?? l.statut,
      formatDate(l.achete_le),
      l.utilise_le ? formatDate(l.utilise_le) : "",
    ])
  );

  const nomFichier = `billets-${(titre ?? "evenement").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
    },
  });
}
