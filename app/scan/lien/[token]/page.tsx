import ScannerClient from "@/app/(orga)/scan/ScannerClient";
import { resoudreEvenementParToken, compteurScan } from "@/lib/scan-liens";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scan délégué — XwézanEvent",
};

/**
 * Accès sans compte pour scanner/rechercher les billets d'UN événement
 * précis, via un lien généré/révocable depuis le dashboard organisateur
 * (voir components/orga/LienScan.tsx). Aucune session créée : le jeton est
 * l'autorisation, transmis à chaque requête (voir extraBody ci-dessous) —
 * re-résolu côté serveur à chaque appel, jamais mis en cache ici.
 */
export default async function ScanParLien({
  params,
}: {
  params: { token: string };
}) {
  const event = await resoudreEvenementParToken(params.token);

  if (!event) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#0a0704",
          color: "#f3eada",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
          fontFamily: "var(--font-instrument, sans-serif)",
        }}
      >
        <div style={{ fontSize: "3rem" }}>🔗</div>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Lien invalide ou révoqué</h1>
        <p style={{ color: "#b7a88f", fontSize: "0.9rem", maxWidth: 320 }}>
          Ce lien de scan n&apos;existe plus — demande à l&apos;organisateur
          de t&apos;en partager un nouveau.
        </p>
      </div>
    );
  }

  const compteurInitial = await compteurScan(event.id);

  return (
    <ScannerClient
      titre={event.titre}
      lienRetour={null}
      apiScan="/api/scan/lien/valider"
      apiRecherche="/api/scan/lien/recherche"
      apiManuel="/api/scan/lien/manuel"
      extraBody={{ token: params.token }}
      compteurInitial={compteurInitial}
    />
  );
}
