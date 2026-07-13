import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CGU & confidentialité — XwézanEvent",
  description:
    "Conditions générales d'utilisation et politique de confidentialité de XwézanEvent.",
};

export default function Cgu() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Informations légales</span>
        <h1>CGU &amp; confidentialité</h1>
        <p className="intro">
          Les règles du jeu, en clair. Ce document décrit comment
          XwézanEvent fonctionne, ce que ça implique pour toi, et comment
          tes données personnelles sont utilisées.
        </p>

        <div className="bloc">
          <h2>Mentions légales</h2>
          <p>
            XwézanEvent est un service exploité par <strong>Digiflow</strong>,
            établissement enregistré au RCCM sous le numéro{" "}
            <strong>RB/COT/24 A 104638</strong> en date du 18-10-2024, N°
            IFU <strong>1201526575807</strong>, sis Îlot 4941, Parcelle A,
            DONATEN, Bénin.
          </p>
          <p>
            {/* TODO : compléter avec l'email et le téléphone professionnels
                dès qu'ils seront disponibles. */}
            Contact : via le formulaire de la page{" "}
            <a href="/contact">Contact</a>.
          </p>
        </div>

        <div className="bloc">
          <h2>1. Qui fait quoi</h2>
          <p>
            XwézanEvent est une <strong>plateforme intermédiaire de
            billetterie</strong>. Nous mettons à disposition les outils pour
            publier un événement, vendre des billets, encaisser en Mobile
            Money et contrôler les entrées — mais{" "}
            <strong>XwézanEvent n&apos;est pas l&apos;organisateur</strong>{" "}
            des événements listés sur la plateforme.
          </p>
          <p>
            L&apos;organisateur reste seul responsable de la tenue, du
            contenu, de la sécurité et de la conformité de son événement. En
            cas de litige lié au déroulement d&apos;un événement (annulation
            non signalée, changement de programmation, accès sur place,
            etc.), la responsabilité en incombe à l&apos;organisateur, pas à
            XwézanEvent.
          </p>
        </div>

        <div className="bloc">
          <h2>2. Responsabilités de l&apos;organisateur</h2>
          <ul>
            <li>
              Fournir des informations exactes sur son événement (date,
              lieu, description, tarifs, affiche).
            </li>
            <li>Tenir l&apos;événement tel qu&apos;annoncé.</li>
            <li>
              Signaler sans délai toute annulation ou modification
              significative, à la fois aux acheteurs et à XwézanEvent.
            </li>
            <li>
              Assurer le contrôle d&apos;accès (scan des billets) et la
              sécurité sur place.
            </li>
          </ul>
        </div>

        <div className="bloc">
          <h2>3. Responsabilités de l&apos;acheteur</h2>
          <ul>
            <li>
              Fournir des informations exactes lors de la création de son
              compte et de ses achats.
            </li>
            <li>
              Présenter son billet (QR code) à l&apos;entrée de
              l&apos;événement.
            </li>
            <li>
              Se référer aux conditions propres à chaque événement
              (règlement, restrictions d&apos;âge, etc.) définies par
              l&apos;organisateur.
            </li>
          </ul>
        </div>

        <div className="bloc">
          <h2>4. Tarification et paiement</h2>
          <p>
            L&apos;acheteur paie le prix affiché du billet, sans frais de
            service XwézanEvent additionnels (seuls d&apos;éventuels frais
            Mobile Money appliqués par l&apos;opérateur de paiement peuvent
            s&apos;ajouter à sa charge, indépendants de XwézanEvent).
            XwézanEvent prélève une commission de 6% côté organisateur, au
            moment du reversement des ventes.
          </p>
          <p>
            Les reversements aux organisateurs sont effectués au plus tôt{" "}
            <strong>3 jours après la tenue de l&apos;événement</strong> — un
            délai de sécurité qui permet de traiter les éventuelles
            annulations et litiges avant l&apos;envoi des fonds. Le détail
            complet est disponible sur nos pages{" "}
            <a href="/tarifs">Tarifs</a> et{" "}
            <a href="/reversements">Reversements</a>. Les paiements sont
            traités via notre partenaire Mobile Money FedaPay.
          </p>
        </div>

        <div className="bloc">
          <h2>5. Politique de remboursement</h2>
          <p>
            Les billets ne sont pas remboursables, sauf en cas
            d&apos;annulation de l&apos;événement. Dans ce cas, les fonds
            sont sécurisés (gel des reversements en attente de
            l&apos;organisateur concerné) et XwézanEvent organise le
            remboursement de chaque acheteur vers son moyen de paiement
            d&apos;origine, sans frais supplémentaire. Le détail complet est
            disponible sur notre page{" "}
            <a href="/remboursements">Remboursements</a>.
          </p>
        </div>

        <div className="bloc">
          <h2>6. Données personnelles</h2>
          <p>Nous collectons et utilisons les données suivantes :</p>
          <ul>
            <li>
              <strong>Compte</strong> : nom, adresse email et numéro de
              téléphone, utilisés pour créer et sécuriser ton compte, et
              pour te contacter au sujet de tes commandes.
            </li>
            <li>
              <strong>Commandes et billets</strong> : historique
              d&apos;achats, billets électroniques (avec QR code unique),
              utilisés pour gérer tes réservations et le contrôle
              d&apos;accès aux événements.
            </li>
            <li>
              <strong>Communications</strong> : des emails transactionnels
              te sont envoyés (confirmation de commande, statut de ton
              événement publié, réinitialisation de mot de passe) — jamais
              de prospection commerciale sans ton accord.
            </li>
          </ul>
          <p>
            Ces données ne sont ni vendues, ni partagées avec des tiers en
            dehors des prestataires strictement nécessaires au
            fonctionnement du service (hébergement, paiement, envoi
            d&apos;emails).
          </p>
        </div>

        <div className="bloc">
          <h2>7. Hébergement</h2>
          <p>
            Les données de XwézanEvent sont hébergées au sein de
            l&apos;Union européenne, sur l&apos;infrastructure Supabase
            (région Paris, France).
          </p>
        </div>

        <div className="bloc">
          <h2>8. Droit applicable</h2>
          <p>
            Les présentes conditions sont régies par le droit béninois. Tout
            litige relève, à défaut de résolution amiable, des juridictions
            compétentes du Bénin.
          </p>
        </div>

        <p className="maj">
          Ce document est susceptible d&apos;évoluer. Dernière mise à jour :
          13 juillet 2026.
        </p>
      </main>

      <Footer />
    </>
  );
}
