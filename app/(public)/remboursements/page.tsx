import type { Metadata } from "next";
import PageContenu from "@/components/v2/public/PageContenu";

export const metadata: Metadata = {
  title: "Remboursements — XwézanEvent",
  description: "La politique de remboursement de XwézanEvent : billets non remboursables, sauf annulation de l'événement.",
};

/**
 * Remboursements (V2), reprise de la preview (v2/remboursements). Texte
 * identique à la version en service avant la V2. Délai de 14 jours et gel des
 * fonds : décision d'Abdias du 2026-09-29, alignée sur les CGU (section 6).
 */
export default function Remboursements() {
  return (
    <PageContenu
      surtitre="Politique"
      titre={<em>Remboursements.</em>}
      intro="Un billet acheté engage une place réservée pour l'organisateur. Voici comment on gère les remboursements, simplement et honnêtement."
      sections={[
        {
          id: "regle",
          titre: "La règle générale",
          contenu: (
            <p>
              <strong>Les billets ne sont pas remboursables</strong>, sauf si l&apos;événement pour lequel ils ont été achetés est <strong>annulé</strong> —
              par l&apos;organisateur ou par notre équipe. On ne rembourse pas un simple changement d&apos;avis, un empêchement personnel, ou une
              insatisfaction sur place : c&apos;est l&apos;organisateur qui définit et assume le déroulement de son événement.
            </p>
          ),
        },
        {
          id: "annulation",
          titre: "Si l'événement est annulé",
          contenu: (
            <>
              <p>
                Dès qu&apos;un événement passe en statut <strong>annulé</strong>, plusieurs choses se déclenchent automatiquement :
              </p>
              <ul>
                <li>La billetterie est fermée et l&apos;événement disparaît du catalogue public.</li>
                <li>Les billets déjà vendus (non encore scannés) sont invalidés et ne seront plus acceptés à l&apos;entrée.</li>
                <li>
                  L&apos;argent est <strong>sécurisé</strong> : les demandes de reversement en attente de l&apos;organisateur pour cet événement sont
                  automatiquement gelées, pour éviter que les fonds ne soient déjà reversés avant que les remboursements acheteurs ne soient traités.
                </li>
              </ul>
              <p>
                Notre équipe organise ensuite le remboursement de chaque acheteur, directement vers le numéro Mobile Money utilisé lors de l&apos;achat.{" "}
                Tu récupères <strong>le prix de ton billet en entier</strong> : XwézanEvent ne retient rien. Les frais de l&apos;opérateur de paiement,
                prélevés lors de l&apos;achat, ne sont pas remboursables.
              </p>
            </>
          ),
        },
        {
          id: "delais",
          titre: "Délais",
          contenu: (
            <p>
              Les remboursements suite à une annulation sont effectués dans un délai de <strong>14 jours</strong> suivant la confirmation de
              l&apos;annulation, le temps de vérifier chaque commande concernée. Ce remboursement ne dépend pas de l&apos;organisateur : les fonds sont
              gelés dès l&apos;annulation et n&apos;ont jamais quitté la plateforme.
            </p>
          ),
        },
        {
          id: "question",
          titre: "Une question sur ton billet ?",
          contenu: (
            <p>
              Si ton événement a été annulé et que tu n&apos;as pas de nouvelles, ou pour toute autre question sur un remboursement,{" "}
              <a href="/contact">contacte-nous</a> — on te répond directement.
            </p>
          ),
        },
      ]}
    />
  );
}
