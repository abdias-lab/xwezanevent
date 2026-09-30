import type { Metadata } from "next";
import s from "@/components/v2/espace.module.css";
import c from "@/components/v2/contenu.module.css";
import Icon from "@/components/v2/Icon";
import PageContenu from "@/components/v2/public/PageContenu";

export const metadata: Metadata = {
  title: "Reversements — XwézanEvent",
  description: "Comment récupérer l'argent de tes ventes de billets sur ton compte Mobile Money.",
};

/**
 * Reversements (V2), reprise de la preview (v2/reversements). Texte identique
 * à la version en service avant la V2. La section « Si l'événement est
 * annulé » sera réécrite avec le chantier « annulation » (BUGS_REFONTE n°7).
 */
export default function Reversements() {
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
                encaissées, moins la commission XwézanEvent de 8% (voir <a href="/tarifs">nos tarifs</a>). Clique sur{" "}
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
                En cas d&apos;annulation d&apos;un événement (par toi ou par notre équipe), les demandes de virement <strong>en attente</strong> liées à cet
                événement sont automatiquement <strong>gelées</strong>. Elles restent visibles dans ton tableau de bord et sont débloquées manuellement par notre
                équipe une fois la situation vérifiée — voir notre <a href="/remboursements">politique de remboursement</a>.
              </p>
              <p>
                <a href="/orga" className={`${s.btn} ${s.btnOr} ${s.btnGrand}`} style={{ textDecoration: "none", color: "var(--inverse)" }}>
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
