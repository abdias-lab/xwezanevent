import type { Metadata } from "next";
import PageContenu from "@/components/v2/public/PageContenu";

export const metadata: Metadata = {
  title: "CGU & confidentialité — XwézanEvent",
  description: "Conditions générales d'utilisation et politique de confidentialité de XwézanEvent.",
};

/** CGU (V2), reprises de la preview (v2/cgu). Texte inchangé (mise à jour du 13 juillet 2026). */
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
      maj="Ce document est susceptible d'évoluer. Dernière mise à jour : 13 juillet 2026."
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
          id: "acheteur",
          titre: "3. Responsabilités de l'acheteur",
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
          titre: "4. Tarification et paiement",
          contenu: (
            <>
              <p>
                L&apos;acheteur paie le prix affiché du billet, sans frais de service XwézanEvent additionnels (seuls d&apos;éventuels frais Mobile Money
                appliqués par l&apos;opérateur de paiement peuvent s&apos;ajouter à sa charge, indépendants de XwézanEvent). XwézanEvent prélève une commission
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
          titre: "5. Politique de remboursement",
          contenu: (
            <p>
              Les billets ne sont pas remboursables, sauf en cas d&apos;annulation de l&apos;événement. Dans ce cas, les fonds sont sécurisés (gel des
              reversements en attente de l&apos;organisateur concerné) et XwézanEvent organise le remboursement de chaque acheteur vers son moyen de paiement
              d&apos;origine, sans frais supplémentaire. Le détail complet est disponible sur notre page <a href="/remboursements">Remboursements</a>.
            </p>
          ),
        },
        {
          id: "donnees",
          titre: "6. Données personnelles",
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
            </>
          ),
        },
        {
          id: "hebergement",
          titre: "7. Hébergement",
          contenu: <p>Les données de XwézanEvent sont hébergées au sein de l&apos;Union européenne, sur l&apos;infrastructure Supabase (région Paris, France).</p>,
        },
        {
          id: "droit",
          titre: "8. Droit applicable",
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
