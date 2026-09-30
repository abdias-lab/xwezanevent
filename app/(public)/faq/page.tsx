import type { Metadata } from "next";
import type { ReactNode } from "react";
import c from "@/components/v2/contenu.module.css";
import Icon from "@/components/v2/Icon";
import PageContenu from "@/components/v2/public/PageContenu";
import { getPaysActuel } from "@/lib/pays";
import { listeOperateursCourt } from "@/lib/telephone";

export const metadata: Metadata = {
  title: "FAQ — XwézanEvent",
  description:
    "Toutes les réponses aux questions fréquentes sur l'achat de billets et l'organisation d'événements sur XwézanEvent.",
};

type Question = { q: string; r: ReactNode };

/**
 * FAQ (V2), reprise de la preview (v2/faq). Questions et réponses inchangées
 * (y compris le vouvoiement : harmonisation proposée en A5,
 * design/BUGS_REFONTE.md). Accordéon natif details/summary, sans JavaScript.
 * Fonction plutôt que tableau statique : la réponse « moyens de paiement »
 * dépend du pays du visiteur (opérateurs différents Bénin/Togo).
 */
const questionsAcheteurs = (operateurs: string): Question[] => [
  {
    q: "Comment acheter un billet ?",
    r: (
      <>
        C&apos;est simple et rapide. Choisissez votre événement, sélectionnez votre type de billet (Standard, VIP…), puis payez en Mobile Money avec votre
        téléphone. Dès la confirmation du paiement, votre billet avec QR code vous est envoyé par email — et il est toujours disponible dans votre espace{" "}
        <a href="/compte">« Mes billets »</a>.
      </>
    ),
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    r: `Pour l'instant, le paiement se fait en Mobile Money — ${operateurs}. Nous travaillons à ajouter d'autres moyens de paiement très prochainement.`,
  },
  {
    q: "Je n'ai pas reçu mon billet, que faire ?",
    r: (
      <>
        Pas d&apos;inquiétude, votre billet n&apos;est jamais perdu. Vérifiez d&apos;abord vos spams (courriers indésirables). Vous pouvez aussi le retrouver
        à tout moment en vous connectant à votre compte, dans <a href="/compte">« Mes billets »</a>. Si vous ne le trouvez toujours pas, contactez-nous
        à <a href="mailto:contact@xwezan.com">contact@xwezan.com</a> avec votre nom et l&apos;événement concerné.
      </>
    ),
  },
  {
    q: "J'ai été débité mais mon paiement a échoué, que se passe-t-il ?",
    r: (
      <>
        Si le paiement n&apos;a pas été confirmé, votre billet n&apos;est pas validé et aucune place ne vous est réservée. En cas de débit sans billet reçu,
        contactez-nous à <a href="mailto:contact@xwezan.com">contact@xwezan.com</a> avec votre numéro de transaction — nous vérifions et régularisons votre
        situation.
      </>
    ),
  },
  {
    q: "Puis-je me faire rembourser ?",
    r: (
      <>
        En dehors d&apos;une annulation de l&apos;événement, les billets ne sont pas remboursables — c&apos;est la politique de XwézanEvent, valable pour tous
        les événements. En cas d&apos;annulation, vous êtes remboursé intégralement. Pour toute demande, consultez notre page{" "}
        <a href="/remboursements">Remboursements</a> ou <a href="/contact">contactez-nous</a>.
      </>
    ),
  },
  {
    q: "Comment présenter mon billet à l'entrée ?",
    r: (
      <>
        Présentez simplement le QR code de votre billet à l&apos;entrée — depuis votre téléphone (email ou <a href="/compte">« Mes billets »</a>) ou
        imprimé, comme vous préférez. L&apos;équipe le scanne, et vous entrez. Chaque billet ne peut être scanné qu&apos;une seule fois.
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
        Créez votre compte, cliquez sur <a href="/creer">« Créer un événement »</a>, renseignez les infos (titre, date, lieu, affiche, types de billets
        et prix). Une fois soumis, votre événement est vérifié rapidement par notre équipe avant d&apos;être publié. Vous êtes accompagné à chaque étape.
      </>
    ),
  },
  {
    q: "Quelle est votre commission ?",
    r: (
      <>
        Nous prélevons une commission de <a href="/tarifs">8 %</a> sur chaque billet vendu. C&apos;est tout : pas d&apos;abonnement, pas de frais
        d&apos;inscription, pas d&apos;avance. Si vous ne vendez pas, vous ne payez rien.
      </>
    ),
  },
  {
    q: "Quand et comment je récupère mon argent ?",
    r: (
      <>
        Vous pouvez demander votre reversement à partir de 3 jours après votre événement, directement depuis votre <a href="/orga">tableau de bord</a>,
        en indiquant votre numéro Mobile Money. Nous traitons les demandes rapidement et vous recevez votre argent directement sur votre Mobile Money. Ce délai
        protège aussi bien vous que vos acheteurs — voir notre page <a href="/reversements">Reversements</a> pour le détail.
      </>
    ),
  },
  {
    q: "Comment suivre mes ventes ?",
    r: (
      <>
        Vous disposez d&apos;un <a href="/orga">tableau de bord</a> dédié où vous suivez vos ventes en temps réel : billets vendus, places restantes,
        revenus, catégorie par catégorie. Vous savez à tout moment où vous en êtes, sans attendre de rapport.
      </>
    ),
  },
  {
    q: "Comment scanner les billets à l'entrée ?",
    r: (
      <>
        Depuis votre espace organisateur, vous accédez au <a href="/scan">scanner intégré</a> : un simple téléphone suffit pour scanner les QR codes à
        l&apos;entrée. Chaque billet est vérifié instantanément et ne peut être utilisé qu&apos;une seule fois — impossible de frauder ou de dupliquer.
      </>
    ),
  },
];

function Liste({ questions }: { questions: Question[] }) {
  return (
    <div className={c.faq}>
      {questions.map((item) => (
        <details key={item.q}>
          <summary>
            {item.q}
            <Icon name="plus" size={20} />
          </summary>
          <div className={c.reponse}>{item.r}</div>
        </details>
      ))}
    </div>
  );
}

export default async function Faq() {
  const operateurs = listeOperateursCourt(await getPaysActuel());
  return (
    <PageContenu
      surtitre="Aide"
      titre={
        <>
          Questions <em>fréquentes.</em>
        </>
      }
      intro={
        <>
          Tout ce qu&apos;il faut savoir pour acheter un billet ou organiser ton événement sur XwézanEvent. Une question sans réponse ici ?{" "}
          <a href="/contact" style={{ color: "#fff", textDecoration: "underline" }}>
            Contacte-nous
          </a>{" "}
          directement.
        </>
      }
      sections={[
        { id: "acheteurs", titre: "Acheteurs", contenu: <Liste questions={questionsAcheteurs(operateurs)} /> },
        { id: "organisateurs", titre: "Organisateurs", contenu: <Liste questions={QUESTIONS_ORGANISATEURS} /> },
      ]}
    />
  );
}
