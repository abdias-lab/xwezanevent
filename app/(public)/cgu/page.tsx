import type { Metadata } from "next";
import PageContenu from "@/components/v2/public/PageContenu";

export const metadata: Metadata = {
  title: "CGU & confidentialité — XwézanEvent",
  description: "Conditions générales d'utilisation et politique de confidentialité de XwézanEvent.",
};

/** CGU (V2), reprises de la preview (v2/cgu). Texte mis à jour le 29 septembre 2026 (modération, délai de remboursement, droits sur les données), puis le 30 septembre 2026 (§5 : plus de promesse sur le prix payé par l'acheteur). */
export default function Cgu() {
  return (
    <PageContenu
      surtitre="Informations légales"
      titre={
        <>
          CGU &amp; <em>confidentialité.</em>
        </>
      }
      intro="Les règles du jeu, en clair. Ce document décrit comment XwézanEvent fonctionne, ce que ça implique pour toi, et comment tes données personnelles sont utilisées."
      maj="Ce document est susceptible d'évoluer. Dernière mise à jour : 30 septembre 2026."
      sections={[
        {
          id: "mentions",
          titre: "Mentions légales",
          contenu: (
            <>
              <p>
                XwézanEvent est un service exploité par <strong>Digiflow</strong>, établissement enregistré au RCCM sous le numéro{" "}
                <strong>RB/COT/24 A 104638</strong> en date du 18-10-2024, N° IFU <strong>1201526575807</strong>, sis Îlot 4941, Parcelle A, DONATEN, Bénin.
              </p>
              <p>
                Contact : <a href="mailto:contact@xwezan.com">contact@xwezan.com</a> ou via le formulaire de la page <a href="/contact">Contact</a>.
              </p>
            </>
          ),
        },
        {
          id: "qui-fait-quoi",
          titre: "1. Qui fait quoi",
          contenu: (
            <>
              <p>
                XwézanEvent est une <strong>plateforme intermédiaire de billetterie</strong>. Nous mettons à disposition les outils pour publier un événement,
                vendre des billets, encaisser en Mobile Money et contrôler les entrées — mais <strong>XwézanEvent n&apos;est pas l&apos;organisateur</strong> des
                événements listés sur la plateforme.
              </p>
              <p>
                L&apos;organisateur reste seul responsable de la tenue, du contenu, de la sécurité et de la conformité de son événement. En cas de litige lié au
                déroulement d&apos;un événement (annulation non signalée, changement de programmation, accès sur place, etc.), la responsabilité en incombe à
                l&apos;organisateur, pas à XwézanEvent.
              </p>
            </>
          ),
        },
        {
          id: "organisateur",
          titre: "2. Responsabilités de l'organisateur",
          contenu: (
            <ul>
              <li>Fournir des informations exactes sur son événement (date, lieu, description, tarifs, affiche).</li>
              <li>Tenir l&apos;événement tel qu&apos;annoncé.</li>
              <li>Signaler sans délai toute annulation ou modification significative, à la fois aux acheteurs et à XwézanEvent.</li>
              <li>Assurer le contrôle d&apos;accès (scan des billets) et la sécurité sur place.</li>
            </ul>
          ),
        },
        {
          id: "moderation",
          titre: "3. Modération",
          contenu: (
            <p>
              Chaque événement soumis sur XwézanEvent passe par une validation avant publication. Nous nous réservons le droit de refuser ou de retirer un
              événement, et de suspendre ou supprimer un compte, en cas de non-respect des présentes conditions, d&apos;informations trompeuses ou de contenu
              illicite — sans que cela ouvre droit à indemnisation.
            </p>
          ),
        },
        {
          id: "acheteur",
          titre: "4. Responsabilités de l'acheteur",
          contenu: (
            <ul>
              <li>Fournir des informations exactes lors de la création de son compte et de ses achats.</li>
              <li>Présenter son billet (QR code) à l&apos;entrée de l&apos;événement.</li>
              <li>Se référer aux conditions propres à chaque événement (règlement, restrictions d&apos;âge, etc.) définies par l&apos;organisateur.</li>
            </ul>
          ),
        },
        {
          id: "tarification",
          titre: "5. Tarification et paiement",
          contenu: (
            <>
              <p>
                XwézanEvent prélève une commission
                de 8% côté organisateur, au moment du reversement des ventes.
              </p>
              <p>
                Les reversements aux organisateurs sont effectués au plus tôt <strong>3 jours après la tenue de l&apos;événement</strong> — un délai de sécurité
                qui permet de traiter les éventuelles annulations et litiges avant l&apos;envoi des fonds. Le détail complet est disponible sur nos pages{" "}
                <a href="/tarifs">Tarifs</a> et <a href="/reversements">Reversements</a>. Les paiements sont traités via notre partenaire Mobile
                Money FedaPay.
              </p>
            </>
          ),
        },
        {
          id: "remboursement",
          titre: "6. Politique de remboursement",
          contenu: (
            <p>
              Les billets ne sont pas remboursables, sauf en cas d&apos;annulation de l&apos;événement. Dans ce cas, les fonds sont sécurisés (gel des
              reversements de l&apos;organisateur concerné) et XwézanEvent organise le remboursement de chaque acheteur vers son moyen de paiement
              d&apos;origine, dans un délai de 14 jours suivant la confirmation de l&apos;annulation. Le prix du billet est remboursé en entier, sans
              retenue de la part de XwézanEvent ; les frais de l&apos;opérateur de paiement prélevés lors de l&apos;achat ne sont pas remboursables. Ce
              remboursement ne dépend
              pas de l&apos;organisateur : les fonds n&apos;ont jamais quitté la plateforme. Le détail complet est disponible sur notre page <a href="/remboursements">Remboursements</a>.
            </p>
          ),
        },
        {
          id: "donnees",
          titre: "7. Données personnelles",
          contenu: (
            <>
              <p>Nous collectons et utilisons les données suivantes :</p>
              <ul>
                <li>
                  <strong>Compte</strong> : nom, adresse email et numéro de téléphone, utilisés pour créer et sécuriser ton compte, et pour te contacter au sujet
                  de tes commandes.
                </li>
                <li>
                  <strong>Commandes et billets</strong> : historique d&apos;achats, billets électroniques (avec QR code unique), utilisés pour gérer tes
                  réservations et le contrôle d&apos;accès aux événements.
                </li>
                <li>
                  <strong>Communications</strong> : des emails transactionnels te sont envoyés (confirmation de commande, statut de ton événement publié,
                  réinitialisation de mot de passe) — jamais de prospection commerciale sans ton accord.
                </li>
              </ul>
              <p>
                Ces données ne sont ni vendues, ni partagées avec des tiers en dehors des prestataires strictement nécessaires au fonctionnement du service
                (hébergement, paiement, envoi d&apos;emails).
              </p>
              <p>
                <strong>Tes droits.</strong> Tu peux à tout moment demander l&apos;accès à tes données, leur rectification ou leur suppression en écrivant à{" "}
                <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>. Nous traitons ces demandes sous 30 jours. La suppression de ton compte entraîne
                l&apos;effacement de tes données personnelles, à l&apos;exception de celles que nous devons conserver pour des obligations légales ou comptables
                (historique de transactions).
              </p>
              <p>
                <strong>Durée de conservation.</strong> Tes données sont conservées tant que ton compte est actif. Après suppression du compte, elles sont
                effacées sous 12 mois, hors obligations légales.
              </p>
            </>
          ),
        },
        {
          id: "hebergement",
          titre: "8. Hébergement",
          contenu: <p>Les données de XwézanEvent sont hébergées au sein de l&apos;Union européenne, sur l&apos;infrastructure Supabase (région Paris, France).</p>,
        },
        {
          id: "droit",
          titre: "9. Droit applicable",
          contenu: (
            <p>
              Les présentes conditions sont régies par le droit béninois. Tout litige relève, à défaut de résolution amiable, des juridictions compétentes du
              Bénin.
            </p>
          ),
        },
      ]}
    />
  );
}
