import type { Metadata } from "next";
import QRCode from "qrcode";
import v from "../v2.module.css";
import s from "../espace.module.css";
import Icon from "../../Icon";
import { Header } from "../chrome";
import { B, RubanEtats } from "../Coquille";
import { EVENEMENT_DETAIL, dateLongue } from "../../_data";
import ActionsBillet from "./ActionsBillet";

export const metadata: Metadata = { title: "Tes billets — XwézanEvent", robots: { index: false } };

// Réglages de lisibilité (BUGS_REFONTE #13) : noir pur sur blanc pur, zone de
// silence de 4 modules (norme), correction d'erreur Q (~25 % du code peut être
// abîmé ou mal éclairé). En prod : margin 1, correction par défaut, 150 px.
const OPTIONS_QR = { errorCorrectionLevel: "Q" as const, margin: 4, color: { dark: "#000000", light: "#ffffff" } };

// Billets de démonstration (code_qr = UUID comme en prod). Référence affichée
// sous chaque QR : celle de la COMMANDE, la seule que la recherche manuelle du
// scanner sait retrouver (décision du 2026-09-29).
const COMMANDE = "3CA2DF9D";
const BILLETS = [
  { code: "7c1f5a0e-3b9d-4e2a-9f61-2d8b0c4e7a13", tarif: "Pass Standard" },
  { code: "b84e2d16-90c3-4f7b-a5e8-61d2c7f09b3e", tarif: "Pass Standard" },
  { code: "e3a9c0d4-5f17-4b6e-8d20-9c4b1a7e62f5", tarif: "Pass VIP" },
];

/**
 * Confirmation et billets QR (preview V2). En prod : app/(public)/confirmation.
 * ?etat=attente : paiement pas encore confirmé (aucun QR tant que la commande
 * n'est pas payée, comme en prod) ; ?etat=un : un seul billet.
 */
export default async function V2Confirmation({ searchParams }: { searchParams: { etat?: string } }) {
  const etat = searchParams.etat;
  const ev = EVENEMENT_DETAIL;
  const billets = await Promise.all(
    (etat === "un" ? BILLETS.slice(0, 1) : BILLETS).map(async (b) => ({
      ...b,
      reference: `XWZ-${COMMANDE}`,
      svg: await QRCode.toString(b.code, { ...OPTIONS_QR, type: "svg" }),
      png: await QRCode.toDataURL(b.code, { ...OPTIONS_QR, width: 800 }),
    })),
  );

  return (
    <div className={`${v.racine} ${s.racineEspace}`}>
      <Header />
      <main className={v.cont} style={{ paddingTop: 32 }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {etat === "attente" ? (
            <div className={s.vide}>
              <span className={s.attenteRond} aria-hidden="true" />
              <h1 className={s.videTitre} style={{ fontSize: 20, lineHeight: "26px" }}>
                Paiement en cours de vérification
              </h1>
              <p className={s.videTexte}>
                FedaPay ne nous a pas encore confirmé ton paiement. Si tu l&apos;as validé, tes billets apparaîtront ici et arriveront par e-mail dès sa
                confirmation. Ne repaie pas.
              </p>
              <a href={`${B}/confirmation`} className={`${s.btn} ${s.btnOr} ${s.btnGrand}`}>
                <Icon name="repeat" /> Vérifier à nouveau
              </a>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
                <Icon name="check" size={48} className={s.montantOr} />
                <h1 className={v.h1}>
                  C&apos;est <em>confirmé.</em>
                </h1>
                <p className={v.sous} style={{ margin: 0 }}>
                  {billets.length > 1 ? `Tes ${billets.length} billets sont prêts` : "Ton billet est prêt"}, envoyés aussi à <b>aicha.houngbedji@exemple.bj</b>.
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
                        {dateLongue(ev)} · {ev.heure}
                        <br />
                        {ev.lieuAdresse}
                      </p>
                      <dl className={s.paires} style={{ fontSize: 14, lineHeight: "20px" }}>
                        <dt>Titulaire</dt>
                        <dd>Aïcha Houngbédji</dd>
                        <dt>Commande</dt>
                        <dd className={s.chiffre}>N° {COMMANDE}</dd>
                      </dl>
                    </div>
                    <div className={s.qrBloc}>
                      <div dangerouslySetInnerHTML={{ __html: b.svg }} role="img" aria-label={`QR code du billet ${b.reference}, à présenter à l'entrée`} />
                      <p className={s.qrRef}>{b.reference}</p>
                      <p className={s.qrAide}>Un billet = une entrée. Ne partage pas ce code.</p>
                    </div>
                    <ActionsBillet svg={b.svg} png={b.png} reference={b.reference} fichier={`billet-${b.reference}-${i + 1}.png`} titre={ev.titre} tarif={b.tarif} />
                  </li>
                ))}
              </ul>

              <div style={{ display: "grid", gap: 8, marginTop: 24 }}>
                <a href={`${B}/compte`} className={`${s.btn} ${s.btnGris} ${s.btnGrand}`}>
                  Voir tous mes billets
                </a>
                <a href={`${B}/evenement`} className={s.note} style={{ textDecoration: "underline", justifySelf: "center" }}>
                  Retour à l&apos;événement
                </a>
              </div>
            </>
          )}
        </div>
        <RubanEtats chemin={`${B}/confirmation`} etats={["normal", "un", "attente"]} />
      </main>
    </div>
  );
}
