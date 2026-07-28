import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "FAQ — XwézanEvent",
  description:
    "Toutes les réponses aux questions fréquentes sur l'achat de billets et l'organisation d'événements sur XwézanEvent.",
};

interface Question {
  q: string;
  r: ReactNode;
}

const QUESTIONS_ACHETEURS: Question[] = [
  {
    q: "Comment acheter un billet ?",
    r: (
      <>
        C&apos;est simple et rapide. Choisissez votre événement, sélectionnez
        votre type de billet (Standard, VIP…), puis payez en Mobile Money
        avec votre téléphone. Dès la confirmation du paiement, votre billet
        avec QR code vous est envoyé par email — et il est toujours
        disponible dans votre espace <Link href="/compte">« Mes billets »</Link>.
      </>
    ),
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    r: "Pour l'instant, le paiement se fait en Mobile Money — MTN, Moov et Celtiis. Nous travaillons à ajouter d'autres moyens de paiement très prochainement.",
  },
  {
    q: "Je n'ai pas reçu mon billet, que faire ?",
    r: (
      <>
        Pas d&apos;inquiétude, votre billet n&apos;est jamais perdu. Vérifiez
        d&apos;abord vos spams (courriers indésirables). Vous pouvez aussi le
        retrouver à tout moment en vous connectant à votre compte, dans{" "}
        <Link href="/compte">« Mes billets »</Link>. Si vous ne le trouvez
        toujours pas, contactez-nous à{" "}
        <a href="mailto:contact@xwezan.com">contact@xwezan.com</a> avec votre
        nom et l&apos;événement concerné.
      </>
    ),
  },
  {
    q: "J'ai été débité mais mon paiement a échoué, que se passe-t-il ?",
    r: (
      <>
        Si le paiement n&apos;a pas été confirmé, votre billet n&apos;est pas
        validé et aucune place ne vous est réservée. En cas de débit sans
        billet reçu, contactez-nous à{" "}
        <a href="mailto:contact@xwezan.com">contact@xwezan.com</a> avec votre
        numéro de transaction — nous vérifions et régularisons votre
        situation.
      </>
    ),
  },
  {
    q: "Puis-je me faire rembourser ?",
    r: (
      <>
        En dehors d&apos;une annulation de l&apos;événement, les billets ne
        sont pas remboursables — c&apos;est la politique de XwézanEvent,
        valable pour tous les événements. En cas d&apos;annulation, vous êtes
        remboursé intégralement. Pour toute demande, consultez notre page{" "}
        <Link href="/remboursements">Remboursements</Link> ou{" "}
        <Link href="/contact">contactez-nous</Link>.
      </>
    ),
  },
  {
    q: "Comment présenter mon billet à l'entrée ?",
    r: (
      <>
        Présentez simplement le QR code de votre billet à l&apos;entrée —
        depuis votre téléphone (email ou <Link href="/compte">« Mes billets »</Link>)
        ou imprimé, comme vous préférez. L&apos;équipe le scanne, et vous
        entrez. Chaque billet ne peut être scanné qu&apos;une seule fois.
      </>
    ),
  },
  {
    q: "Puis-je transférer mon billet à quelqu'un d'autre ?",
    r: "Votre billet est valable pour une seule entrée. Vous pouvez le transmettre à un proche en lui envoyant son QR code — mais attention : le premier à le présenter à l'entrée sera le seul admis. Ne partagez donc votre billet qu'avec une personne de confiance.",
  },
];

const QUESTIONS_ORGANISATEURS: Question[] = [
  {
    q: "Comment créer et publier mon événement ?",
    r: (
      <>
        Créez votre compte, cliquez sur <Link href="/creer">« Créer un événement »</Link>,
        renseignez les infos (titre, date, lieu, affiche, types de billets et
        prix). Une fois soumis, votre événement est vérifié rapidement par
        notre équipe avant d&apos;être publié. Vous êtes accompagné à chaque
        étape.
      </>
    ),
  },
  {
    q: "Quelle est votre commission ?",
    r: (
      <>
        Nous prélevons une commission de <Link href="/tarifs">8 %</Link> sur
        chaque billet vendu. C&apos;est tout : pas d&apos;abonnement, pas de
        frais d&apos;inscription, pas d&apos;avance. Si vous ne vendez pas,
        vous ne payez rien.
      </>
    ),
  },
  {
    q: "Quand et comment je récupère mon argent ?",
    r: (
      <>
        Vous pouvez demander votre reversement à partir de 3 jours après
        votre événement, directement depuis votre{" "}
        <Link href="/orga">tableau de bord</Link>, en indiquant votre numéro
        Mobile Money. Nous traitons les demandes rapidement et vous recevez
        votre argent directement sur votre Mobile Money. Ce délai protège
        aussi bien vous que vos acheteurs — voir notre page{" "}
        <Link href="/reversements">Reversements</Link> pour le détail.
      </>
    ),
  },
  {
    q: "Comment suivre mes ventes ?",
    r: (
      <>
        Vous disposez d&apos;un <Link href="/orga">tableau de bord</Link>{" "}
        dédié où vous suivez vos ventes en temps réel : billets vendus,
        places restantes, revenus, catégorie par catégorie. Vous savez à tout
        moment où vous en êtes, sans attendre de rapport.
      </>
    ),
  },
  {
    q: "Comment scanner les billets à l'entrée ?",
    r: (
      <>
        Depuis votre espace organisateur, vous accédez au{" "}
        <Link href="/scan">scanner intégré</Link> : un simple téléphone
        suffit pour scanner les QR codes à l&apos;entrée. Chaque billet est
        vérifié instantanément et ne peut être utilisé qu&apos;une seule
        fois — impossible de frauder ou de dupliquer.
      </>
    ),
  },
];

function ListeQuestions({ questions }: { questions: Question[] }) {
  return (
    <div className="faq-liste">
      {questions.map((item) => (
        <details key={item.q} className="faq-item">
          <summary>
            {item.q}
            <span className="faq-icone" aria-hidden="true">+</span>
          </summary>
          <div className="faq-reponse">{item.r}</div>
        </details>
      ))}
    </div>
  );
}

export default function Faq() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Aide</span>
        <h1>Questions fréquentes</h1>
        <p className="intro">
          Tout ce qu&apos;il faut savoir pour acheter un billet ou organiser
          ton événement sur XwézanEvent. Une question sans réponse ici ?{" "}
          <Link href="/contact">Contacte-nous</Link> directement.
        </p>

        <div className="bloc">
          <h2>Acheteurs</h2>
          <ListeQuestions questions={QUESTIONS_ACHETEURS} />
        </div>

        <div className="bloc">
          <h2>Organisateurs</h2>
          <ListeQuestions questions={QUESTIONS_ORGANISATEURS} />
        </div>
      </main>

      <Footer />
    </>
  );
}
