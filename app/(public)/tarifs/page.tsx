import type { Metadata } from "next";
import s from "@/components/v2/espace.module.css";
import c from "@/components/v2/contenu.module.css";
import Icon from "@/components/v2/Icon";
import PageContenu from "@/components/v2/public/PageContenu";
import { getPaysActuel } from "@/lib/pays";
import { listeOperateursCourt } from "@/lib/telephone";

export const metadata: Metadata = {
  title: "Tarifs — 8% tout compris — XwézanEvent",
  description: "Une seule commission de 8%, prélevée uniquement sur les billets vendus. Pas d'abonnement, pas de frais cachés.",
};

/**
 * Tarifs (V2), reprise de la preview (v2/tarifs). Texte repris mot pour mot de app/(public)/tarifs ; les
 * opérateurs viennent de lib/telephone.ts comme en prod (pays : Bénin).
 * Emojis de la prod remplacés par les icônes SVG de la V2.
 */
export default async function Tarifs() {
  // Opérateurs Mobile Money du pays du visiteur (Bénin/Togo), comme avant la V2.
  const operateurs = listeOperateursCourt(await getPaysActuel());
  return (
    <PageContenu
      surtitre="Pour les organisateurs"
      titre={
        <>
          8% tout compris, <em>c&apos;est tout.</em>
        </>
      }
      intro="Pas d'abonnement, pas de frais d'inscription, pas de coûts cachés. Tu ne payes que si tu vends — une seule commission, prélevée uniquement sur les billets réellement vendus."
      avant={
        <div className={c.chiffreCle}>
          <b>8%</b>
          <span>de commission sur chaque billet vendu, rien d&apos;autre</span>
        </div>
      }
      sections={[
        {
          id: "fonctionnement",
          titre: "Comment ça marche",
          contenu: (
            <>
              <p>
                Ton acheteur paie <strong>exactement le prix affiché</strong> du billet — XwézanEvent n&apos;ajoute aucun frais de service dessus. (Seuls
                d&apos;éventuels frais Mobile Money appliqués par FedaPay, notre partenaire de paiement, peuvent s&apos;ajouter à sa charge : ils ne dépendent pas
                de nous.)
              </p>
              <p>
                De ton côté, à chaque demande de reversement, XwézanEvent retient 8% du montant des ventes de l&apos;événement concerné. Le reste part
                directement sur ton compte {operateurs}.
              </p>
              <div className={c.encadre}>
                <h3>Exemple concret</h3>
                <dl className={c.calcul}>
                  <div>
                    <dt>Prix du billet</dt>
                    <dd>10 000 FCFA</dd>
                  </div>
                  <div>
                    <dt>Payé par l&apos;acheteur</dt>
                    <dd>10 000 FCFA</dd>
                  </div>
                  <div>
                    <dt>Commission XwézanEvent (8%)</dt>
                    <dd>− 800 FCFA</dd>
                  </div>
                  <div className={c.total}>
                    <dt>Reversé à l&apos;organisateur</dt>
                    <dd>9 200 FCFA</dd>
                  </div>
                </dl>
              </div>
            </>
          ),
        },
        {
          id: "inclus",
          titre: "Ce qui est inclus",
          contenu: (
            <ul className={c.inclus}>
              <li>
                <Icon name="phone" size={20} />
                <span>Paiement Mobile Money ({operateurs}) intégré, prêt à l&apos;emploi</span>
              </li>
              <li>
                <Icon name="ticket" size={20} />
                <span>Billets électroniques avec QR code, générés automatiquement</span>
              </li>
              <li>
                <Icon name="qr" size={20} />
                <span>Scan de contrôle d&apos;accès à l&apos;entrée, en temps réel</span>
              </li>
              <li>
                <Icon name="wallet" size={20} />
                <span>Dashboard organisateur : ventes, revenus, demandes de reversement</span>
              </li>
            </ul>
          ),
        },
        {
          id: "gratuits",
          titre: "Événements gratuits",
          contenu: (
            <>
              <p>Billet à 0 FCFA = 0 FCFA de commission. Publie et gère tes événements gratuits sans rien débourser.</p>
              <p>
                <a href="/creer" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ textDecoration: "none", color: "var(--inverse)" }}>
                  <Icon name="plus" /> Publier un événement
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
