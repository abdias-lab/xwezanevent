import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BoutonOr from "@/components/BoutonOr";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tarifs — 6% tout compris — XwézanEvent",
  description:
    "Une seule commission de 6%, prélevée uniquement sur les billets vendus. Pas d'abonnement, pas de frais cachés.",
};

export default function Tarifs() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Pour les organisateurs</span>
        <h1>6% tout compris, c&apos;est tout.</h1>
        <p className="intro">
          Pas d&apos;abonnement, pas de frais d&apos;inscription, pas de coûts
          cachés. Tu ne payes que si tu vends — une seule commission,
          prélevée uniquement sur les billets réellement vendus.
        </p>

        <div className="gros-chiffre">
          <div className="n">6%</div>
          <div className="l">de commission sur chaque billet vendu, rien d&apos;autre</div>
        </div>

        <div className="bloc">
          <h2>Comment ça marche</h2>
          <p>
            Ton acheteur paie <strong>exactement le prix affiché</strong> du
            billet — XwézanEvent n&apos;ajoute aucun frais de service dessus.
            (Seuls d&apos;éventuels frais Mobile Money appliqués par FedaPay,
            notre partenaire de paiement, peuvent s&apos;ajouter à sa charge :
            ils ne dépendent pas de nous.)
          </p>
          <p>
            De ton côté, à chaque demande de reversement, XwézanEvent retient
            6% du montant des ventes de l&apos;événement concerné. Le reste
            part directement sur ton compte MTN, Moov ou Celtiis Money.
          </p>

          <div className="encadre">
            <h3>Exemple concret</h3>
            <div className="calc-tarif">
              <span>Prix du billet</span>
              <span className="valeur">10 000 FCFA</span>
            </div>
            <div className="calc-tarif">
              <span>Payé par l&apos;acheteur</span>
              <span className="valeur">10 000 FCFA</span>
            </div>
            <div className="calc-tarif">
              <span>Commission XwézanEvent (6%)</span>
              <span className="valeur">− 600 FCFA</span>
            </div>
            <div className="calc-tarif final">
              <span>Reversé à l&apos;organisateur</span>
              <span className="valeur">9 400 FCFA</span>
            </div>
          </div>
        </div>

        <div className="bloc">
          <h2>Ce qui est inclus</h2>
          <div className="inclus-grille">
            <div className="inclus-item">
              <span className="ic">📱</span>
              Paiement Mobile Money (MTN, Moov &amp; Celtiis) intégré, prêt à
              l&apos;emploi
            </div>
            <div className="inclus-item">
              <span className="ic">🎫</span>
              Billets électroniques avec QR code, générés automatiquement
            </div>
            <div className="inclus-item">
              <span className="ic">📷</span>
              Scan de contrôle d&apos;accès à l&apos;entrée, en temps réel
            </div>
            <div className="inclus-item">
              <span className="ic">📊</span>
              Dashboard organisateur : ventes, revenus, demandes de
              reversement
            </div>
          </div>
        </div>

        <div className="bloc">
          <h2>Événements gratuits</h2>
          <p>
            Billet à 0 FCFA = 0 FCFA de commission. Publie et gère tes
            événements gratuits sans rien débourser.
          </p>
        </div>

        <div className="bloc" style={{ textAlign: "center" }}>
          <BoutonOr href="/creer">Publier un événement</BoutonOr>
        </div>
      </main>

      <Footer />
    </>
  );
}
