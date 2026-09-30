import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resoudreEvenementParToken, compteurScan } from "@/lib/scan-liens";
import Icon from "@/components/v2/Icon";
import Scanner from "@/components/v2/scan/Scanner";
import { POLICES_V2 } from "@/components/v2/polices";
import { dateCourte } from "@/components/v2/format";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = {
  title: "Scan délégué — XwézanEvent",
  robots: { index: false },
};

/**
 * Accès sans compte pour scanner/rechercher les billets d'UN événement
 * précis, via un lien généré/révocable depuis la fiche de l'événement
 * (voir components/v2/orga/LienScan.tsx). Aucune session créée : le jeton est
 * l'autorisation, transmis à chaque requête (extraBody) et re-résolu côté
 * serveur à chaque appel, jamais mis en cache ici. Design : preview
 * v2/scan/lien/[token].
 */
export default async function ScanParLien({ params }: { params: { token: string } }) {
  const event = await resoudreEvenementParToken(params.token);

  if (!event) {
    return (
      <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div className={s.vide} style={{ maxWidth: 400 }}>
          <Icon name="link" size={48} className={s.montantOr} />
          <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
            Lien invalide ou révoqué
          </h1>
          <p className={s.videTexte}>Ce lien de scan n&apos;existe plus. Demande à l&apos;organisateur de t&apos;en partager un nouveau.</p>
        </div>
      </div>
    );
  }

  // Jeton déjà validé ci-dessus : date et lieu pour l'en-tête (service_role, comme la résolution du jeton).
  const [compteurInitial, { data: details }] = await Promise.all([
    compteurScan(event.id),
    supabaseAdmin.from("events").select("date_debut, date_fin, heure, lieu").eq("id", event.id).single(),
  ]);

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`} style={{ minHeight: "100vh" }}>
      <header className={s.topbar} style={{ position: "sticky", top: 0 }}>
        <span className={v.logo} aria-label="XwézanEvent">
          <span className={v.logoX}>Xwézan</span>
        </span>
        <span className={s.role}>Accès délégué</span>
      </header>
      <main style={{ padding: "16px 16px 48px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h1 className={s.titre}>{event.titre}</h1>
          {details && (
            <p className={s.sousTitre}>
              {[dateCourte(details.date_debut, details.date_fin), details.heure?.slice(0, 5), details.lieu].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className={s.note} style={{ marginTop: 4 }}>
            Tu contrôles les entrées de cet événement uniquement. Ce lien peut être révoqué par l&apos;organisateur à tout moment.
          </p>
        </div>
        <Scanner
          apiScan="/api/scan/lien/valider"
          apiRecherche="/api/scan/lien/recherche"
          apiManuel="/api/scan/lien/manuel"
          extraBody={{ token: params.token }}
          compteurInitial={compteurInitial}
          retour={false}
          delegue
        />
      </main>
    </div>
  );
}
