import type { Metadata } from "next";
import s from "../espace.module.css";
import c from "../contenu.module.css";
import Icon from "../../Icon";
import PageContenu from "../PageContenu";
import { B } from "../Coquille";
import { listeOperateursCourt } from "@/lib/telephone";

export const metadata: Metadata = { title: "Tarifs — 8% tout compris — XwézanEvent" };

/**
 * Tarifs (preview V2). Texte repris mot pour mot de app/(public)/tarifs ; les
 * opérateurs viennent de lib/telephone.ts comme en prod (pays : Bénin).
 * Emojis de la prod remplacés par les icônes SVG de la V2.
 */
export default function V2Tarifs() {
  const operateurs = listeOperateursCourt("bj");
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
                <a href={`${B}/creer`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ textDecoration: "none", color: "var(--inverse)" }}>
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
