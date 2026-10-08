import type { Metadata } from "next";
import s from "../espace.module.css";
import c from "../contenu.module.css";
import Icon from "../../Icon";
import PageContenu from "../PageContenu";
import { B } from "../Coquille";

export const metadata: Metadata = { title: "Reversements — XwézanEvent" };

/**
 * Reversements (preview V2). Texte repris mot pour mot de app/(public)/reversements.
 * Section « Si l'événement est annulé » réécrite le 2026-10-08 (BUGS_REFONTE
 * n°7), comme en prod : les fonds servent au remboursement des acheteurs, les
 * demandes en attente sont gelées, aucun déblocage promis.
 */
export default function V2Reversements() {
  return (
    <PageContenu
      surtitre="Pour les organisateurs"
      titre={
        <>
          Récupérer <em>tes ventes.</em>
        </>
      }
      intro="Tu demandes le reversement de tes ventes à partir de 3 jours après la tenue de ton événement, événement par événement, directement depuis ton espace organisateur."
      sections={[
        {
          id: "quand",
          titre: "Quand puis-je demander un reversement ?",
          contenu: (
            <p>
              Le reversement d&apos;un événement devient disponible <strong>3 jours après sa tenue</strong> (sa date de fin, s&apos;il se déroule sur plusieurs
              jours) — un délai de sécurité qui permet de traiter d&apos;éventuelles annulations ou litiges avant l&apos;envoi des fonds. Avant cette date, la
              demande est refusée automatiquement.
            </p>
          ),
        },
        {
          id: "comment",
          titre: "Comment demander un reversement",
          contenu: (
            <>
              <p>
                Une fois ce délai passé, ton <strong>tableau de bord</strong> (<code>/orga</code>) affiche le solde disponible de l&apos;événement — les ventes
                encaissées, moins la commission XwézanEvent de 8% (voir <a href={`${B}/tarifs`}>nos tarifs</a>). Clique sur{" "}
                <strong>« Demander un virement »</strong>, choisis le montant (le solde disponible ou une partie) et ton moyen de réception.
              </p>
              <p>
                Tu peux demander plusieurs reversements successifs sur un même événement, tant qu&apos;il reste du solde disponible — pas besoin d&apos;attendre
                entre deux demandes.
              </p>
            </>
          ),
        },
        {
          id: "moyens",
          titre: "Moyens de réception",
          contenu: (
            <ul className={c.inclus}>
              {["MTN Mobile Money", "Moov Money", "Celtiis Money"].map((m) => (
                <li key={m}>
                  <Icon name="phone" size={20} />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          ),
        },
        {
          id: "delais",
          titre: "Délais",
          contenu: (
            <p>
              À titre indicatif, les demandes de virement sont traitées manuellement par notre équipe sous <strong>48 à 72 heures ouvrées</strong> après la
              demande. Ce délai n&apos;est pas garanti contractuellement et peut varier selon le volume de demandes.
            </p>
          ),
        },
        {
          id: "annulation",
          titre: "Si l'événement est annulé",
          contenu: (
            <>
              <p>
                Si un événement est annulé (par toi ou par notre équipe), l&apos;argent de ses ventes sert à <strong>rembourser les acheteurs</strong> : chacun
                est remboursé en entier, sous 14 jours, directement par XwézanEvent. Voir notre <a href={`${B}/remboursements`}>politique de remboursement</a>.
              </p>
              <p>
                Pour toi, cela veut dire : plus aucune demande de virement possible pour cet événement, et tes demandes <strong>en attente</strong> sont{" "}
                <strong>gelées</strong> : elles restent visibles dans ton tableau de bord, mais ne sont pas versées.
              </p>
              <p>
                Un cas particulier (virement déjà reçu avant l&apos;annulation, par exemple) ? Écris-nous à{" "}
                <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>.
              </p>
              <p>
                <a href={`${B}/orga`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ textDecoration: "none", color: "var(--inverse)" }}>
                  <Icon name="home" /> Voir mon tableau de bord
                </a>
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
