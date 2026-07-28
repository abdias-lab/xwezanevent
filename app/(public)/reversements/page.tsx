import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BoutonOr from "@/components/BoutonOr";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reversements — XwézanEvent",
  description:
    "Comment récupérer l'argent de tes ventes de billets sur ton compte Mobile Money.",
};

export default function Reversements() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Pour les organisateurs</span>
        <h1>Récupérer tes ventes</h1>
        <p className="intro">
          Tu demandes le reversement de tes ventes à partir de 3 jours après
          la tenue de ton événement, événement par événement, directement
          depuis ton espace organisateur.
        </p>

        <div className="bloc">
          <h2>Quand puis-je demander un reversement ?</h2>
          <p>
            Le reversement d&apos;un événement devient disponible{" "}
            <strong>3 jours après sa tenue</strong> (sa date de fin, s&apos;il
            se déroule sur plusieurs jours) — un délai de sécurité qui permet
            de traiter d&apos;éventuelles annulations ou litiges avant
            l&apos;envoi des fonds. Avant cette date, la demande est refusée
            automatiquement.
          </p>
        </div>

        <div className="bloc">
          <h2>Comment demander un reversement</h2>
          <p>
            Une fois ce délai passé, ton <strong>tableau de bord</strong> (
            <code>/orga</code>) affiche le solde disponible de
            l&apos;événement — les ventes encaissées, moins la commission
            XwézanEvent de 8% (voir{" "}
            <a href="/tarifs">nos tarifs</a>). Clique sur{" "}
            <strong>« Demander un virement »</strong>, choisis le montant (le
            solde disponible ou une partie) et ton moyen de réception.
          </p>
          <p>
            Tu peux demander plusieurs reversements successifs sur un même
            événement, tant qu&apos;il reste du solde disponible — pas besoin
            d&apos;attendre entre deux demandes.
          </p>
        </div>

        <div className="bloc">
          <h2>Moyens de réception</h2>
          <div className="inclus-grille">
            <div className="inclus-item">
              <span className="ic">📱</span>
              MTN Mobile Money
            </div>
            <div className="inclus-item">
              <span className="ic">📱</span>
              Moov Money
            </div>
            <div className="inclus-item">
              <span className="ic">📱</span>
              Celtiis Money
            </div>
          </div>
        </div>

        <div className="bloc">
          <h2>Délais</h2>
          <p>
            À titre indicatif, les demandes de virement sont traitées
            manuellement par notre équipe sous <strong>48 à 72 heures
            ouvrées</strong> après la demande. Ce délai n&apos;est pas garanti
            contractuellement et peut varier selon le volume de demandes.
          </p>
        </div>

        <div className="bloc">
          <h2>Si l&apos;événement est annulé</h2>
          <p>
            En cas d&apos;annulation d&apos;un événement (par toi ou par notre
            équipe), les demandes de virement <strong>en attente</strong>{" "}
            liées à cet événement sont automatiquement{" "}
            <strong>gelées</strong>. Elles restent visibles dans ton
            tableau de bord et sont débloquées manuellement par notre équipe
            une fois la situation vérifiée — voir notre{" "}
            <a href="/remboursements">politique de remboursement</a>.
          </p>
        </div>

        <div className="bloc" style={{ textAlign: "center" }}>
          <BoutonOr href="/orga">Voir mon tableau de bord</BoutonOr>
        </div>
      </main>

      <Footer />
    </>
  );
}
