import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import QRCode from "qrcode";
import { creerClientServeur } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { OPTIONS_QR_BILLET } from "@/lib/qr-billet";
import { POLICES_V2 } from "@/components/v2/polices";
import { Header } from "@/components/v2/public/Chrome";
import Icon from "@/components/v2/Icon";
import ActionsBillet from "@/components/v2/compte/ActionsBillet";
import { dateLongue } from "@/components/v2/public/evenement";
import v from "@/components/v2/v2.module.css";
import s from "@/components/v2/espace.module.css";

export const metadata: Metadata = { title: "Tes billets — XwézanEvent", robots: { index: false } };

// Cette page est accessible par id de commande seul pour un achat invité
// (voir plus bas) : si cette URL fuite, l'e-mail affiché ne doit pas être
// lisible en clair par un tiers — seul le premier caractère reste visible.
function masquerEmail(email: string): string {
  const [local, domaine] = email.split("@");
  if (!local || !domaine) return email;
  return `${local[0]}•••@${domaine}`;
}

interface OrderRow {
  id: string;
  statut: string;
  user_id: string | null;
  acheteur_nom: string | null;
  acheteur_email: string | null;
  event_id: string;
  tickets: { id: string; code_qr: string; ticket_type_id: string }[];
}

const SELECTION_COMMANDE = "id, statut, user_id, acheteur_nom, acheteur_email, event_id, tickets(id, code_qr, ticket_type_id)";

/**
 * Confirmation et billets QR (V2), repris de la preview (v2/confirmation).
 * Réglages de lisibilité des QR : lib/qr-billet.ts (BUGS_REFONTE n°13).
 * Aucun QR tant que la commande n'est pas payée.
 */
export default async function Confirmation({ searchParams }: { searchParams: { order?: string } }) {
  const orderId = searchParams.order;
  if (!orderId) notFound();

  const supabase = creerClientServeur();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Compte connecté : SA commande uniquement. Le filtre user_id est
  // indispensable : la RLS laisse aussi un organisateur lire les commandes
  // de ses événements, qui affichait donc les billets et QR codes de ses
  // acheteurs (BUGS_REFONTE n°18). Jamais de commande invité par ce chemin.
  let order: OrderRow | null = null;
  if (user) {
    const { data } = await supabase.from("orders").select(SELECTION_COMMANDE).eq("id", orderId).eq("user_id", user.id).maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    // Pas trouvé (pas connecté, ou connecté mais pas propriétaire) : peut-être
    // une commande invité. Elle n'a pas de session à vérifier — l'id de
    // commande (UUID non devinable) sert de jeton d'accès, comme
    // /paiement/retour le fait déjà pour toutes les commandes.
    const { data } = await supabaseAdmin.from("orders").select(SELECTION_COMMANDE).eq("id", orderId).is("user_id", null).maybeSingle();
    order = data as unknown as OrderRow | null;
  }

  if (!order) {
    // Ni sa commande, ni une commande invité : exige la connexion
    // (ex. lien de confirmation d'un compte consulté déconnecté).
    if (!user) {
      redirect(`/connexion?redirect=${encodeURIComponent(`/confirmation?order=${orderId}`)}`);
    }
    notFound();
  }

  // Événement, tarifs et nom du titulaire lus côté serveur, APRÈS la preuve
  // d'accès ci-dessus (la RLS ne laisse lire que les événements publiés ou
  // terminés, et le nom d'un compte n'est pas lisible par un invité).
  const idsTarifs = Array.from(new Set(order.tickets.map((t) => t.ticket_type_id)));
  const [{ data: ev }, { data: tarifs }, { data: profil }] = await Promise.all([
    supabaseAdmin.from("events").select("titre, slug, date_debut, date_fin, heure, lieu, ville, statut").eq("id", order.event_id).maybeSingle(),
    idsTarifs.length ? supabaseAdmin.from("ticket_types").select("id, nom").in("id", idsTarifs) : Promise.resolve({ data: [] }),
    order.user_id ? supabaseAdmin.from("profiles").select("nom").eq("id", order.user_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  // Événement annulé : ses billets ne valent plus rien, comme avant la V2
  // (la RLS le masquait, d'où une page introuvable) ; /compte en explique la raison.
  if (!ev || ev.statut === "annule") notFound();

  const paye = order.statut === "paye";
  const commande = order.id.slice(0, 8).toUpperCase();
  const reference = `XWZ-${commande}`; // celle que la recherche manuelle du scanner retrouve
  const titulaire = order.user_id ? (profil?.nom ?? user?.email ?? "") : (order.acheteur_nom ?? "");
  const email = masquerEmail(order.user_id ? (user?.email ?? "") : (order.acheteur_email ?? ""));
  const nomsTarifs = new Map((tarifs ?? []).map((t) => [t.id as string, t.nom as string]));
  const heure = ev.heure ? String(ev.heure).slice(0, 5) : null;

  // Les billets ne sont générés qu'à la finalisation du paiement (voir
  // finaliserCommande) : tant que statut !== "paye", order.tickets est vide.
  // On ne génère les QR que dans ce cas, pour ne jamais laisser un visuel de
  // succès s'afficher sur une commande non payée.
  const billets = paye
    ? await Promise.all(
        order.tickets.map(async (t) => ({
          code: t.code_qr,
          tarif: nomsTarifs.get(t.ticket_type_id) ?? "Billet",
          svg: await QRCode.toString(t.code_qr, { ...OPTIONS_QR_BILLET, type: "svg" }),
          png: await QRCode.toDataURL(t.code_qr, { ...OPTIONS_QR_BILLET, width: 800 }),
        })),
      )
    : [];

  return (
    <div className={`${POLICES_V2} ${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {!paye ? (
            <div className={s.vide}>
              <span className={s.attenteRond} aria-hidden="true" />
              <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
                Paiement en cours de vérification
              </h1>
              <p className={s.videTexte}>
                FedaPay ne nous a pas encore confirmé ton paiement. Si tu l&apos;as validé, tes billets apparaîtront ici et arriveront par e-mail dès sa
                confirmation. Ne repaie pas.
              </p>
              <Link href={`/confirmation?order=${order.id}`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                <Icon name="repeat" /> Vérifier à nouveau
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
                <Icon name="check" size={48} className={s.montantOr} />
                <h1 className={v.h1}>
                  C&apos;est <em>confirmé.</em>
                </h1>
                <p className={v.sous} style={{ margin: 0 }}>
                  {billets.length > 1 ? `Tes ${billets.length} billets sont prêts` : "Ton billet est prêt"}, envoyés aussi à <b>{email}</b>.
                </p>
              </div>

              <p className={s.alerte} style={{ marginBottom: 16 }}>
                <Icon name="info" />
                <span>
                  À l&apos;entrée : ouvre le billet <b>en plein écran</b> et monte la luminosité. Pas de réseau sur place ? <b>Enregistre</b> tes billets
                  maintenant.
                </span>
              </p>

              <ul className={s.pile} style={{ gap: 16 }}>
                {billets.map((b, i) => (
                  <li key={b.code} className={s.billet} aria-label={`Billet ${i + 1} sur ${billets.length}`}>
                    <div className={s.billetHaut}>
                      <span className={s.note}>
                        Billet {i + 1}/{billets.length} · {b.tarif}
                      </span>
                      <h2 className={s.billetTitre}>{ev.titre}</h2>
                      <p className={s.carteMeta}>
                        {dateLongue({ debut: ev.date_debut, fin: ev.date_fin ?? undefined })}
                        {heure ? ` · ${heure}` : ""}
                        <br />
                        {ev.lieu}, {ev.ville}
                      </p>
                      <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                        <dt>Titulaire</dt>
                        <dd>{titulaire}</dd>
                        <dt>Commande</dt>
                        <dd className={s.chiffre}>N° {commande}</dd>
                      </dl>
                    </div>
                    <div className={s.qrBloc}>
                      <div dangerouslySetInnerHTML={{ __html: b.svg }} role="img" aria-label={`QR code du billet ${reference}, à présenter à l'entrée`} />
                      <p className={s.qrRef}>{reference}</p>
                      <p className={s.qrAide}>Un billet = une entrée. Ne partage pas ce code.</p>
                    </div>
                    <ActionsBillet svg={b.svg} png={b.png} reference={reference} fichier={`billet-${reference}-${i + 1}.png`} titre={ev.titre} tarif={b.tarif} />
                  </li>
                ))}
              </ul>

              <div style={{ display: "grid", gap: 8, marginTop: 24 }}>
                {/* Acheteur invité : pas de compte ; ses billets se retrouvent par e-mail. */}
                <Link href={order.user_id ? "/compte" : "/billet"} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                  {order.user_id ? "Voir tous mes billets" : "Retrouver mes billets par e-mail"}
                </Link>
                <Link href={`/evenement/${ev.slug}`} className={s.note} style={{ textDecoration: "underline", justifySelf: "center" }}>
                  Retour à l&apos;événement
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
