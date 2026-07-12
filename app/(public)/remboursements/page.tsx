import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remboursements — XwézanEvent",
  description: "La politique de remboursement de XwézanEvent : billets non remboursables, sauf annulation de l'événement.",
};

export default function Remboursements() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Politique</span>
        <h1>Remboursements</h1>
        <p className="intro">
          Un billet acheté engage une place réservée pour l&apos;organisateur.
          Voici comment on gère les remboursements, simplement et
          honnêtement.
        </p>

        <div className="bloc">
          <h2>La règle générale</h2>
          <p>
            <strong>Les billets ne sont pas remboursables</strong>, sauf si
            l&apos;événement pour lequel ils ont été achetés est{" "}
            <strong>annulé</strong> — par l&apos;organisateur ou par notre
            équipe. On ne rembourse pas un simple changement d&apos;avis, un
            empêchement personnel, ou une insatisfaction sur place : c&apos;est
            l&apos;organisateur qui définit et assume le déroulement de son
            événement.
          </p>
        </div>

        <div className="bloc">
          <h2>Si l&apos;événement est annulé</h2>
          <p>
            Dès qu&apos;un événement passe en statut{" "}
            <strong>annulé</strong>, plusieurs choses se déclenchent
            automatiquement :
          </p>
          <ul>
            <li>
              La billetterie est fermée et l&apos;événement disparaît du
              catalogue public.
            </li>
            <li>
              Les billets déjà vendus (non encore scannés) sont invalidés et
              ne seront plus acceptés à l&apos;entrée.
            </li>
            <li>
              L&apos;argent est <strong>sécurisé</strong> : les demandes de
              reversement en attente de l&apos;organisateur pour cet
              événement sont automatiquement gelées, pour éviter que les
              fonds ne soient déjà reversés avant que les remboursements
              acheteurs ne soient traités.
            </li>
          </ul>
          <p>
            Notre équipe organise ensuite le remboursement de chaque
            acheteur, directement vers le numéro Mobile Money utilisé lors de
            l&apos;achat. <strong>Aucun frais supplémentaire</strong>{" "}
            n&apos;est prélevé sur le remboursement — tu récupères
            l&apos;intégralité du prix payé.
          </p>
        </div>

        <div className="bloc">
          <h2>Délais</h2>
          <p>
            À titre indicatif, les remboursements suite à une annulation sont
            traités sous <strong>5 à 10 jours ouvrés</strong> après la
            confirmation de l&apos;annulation, le temps de vérifier chaque
            commande concernée. Ce délai n&apos;est pas garanti
            contractuellement.
          </p>
        </div>

        <div className="bloc">
          <h2>Une question sur ton billet ?</h2>
          <p>
            Si ton événement a été annulé et que tu n&apos;as pas de
            nouvelles, ou pour toute autre question sur un remboursement,{" "}
            <a href="/contact">contacte-nous</a> — on te répond directement.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
