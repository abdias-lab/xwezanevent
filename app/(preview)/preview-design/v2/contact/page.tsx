import type { Metadata } from "next";
import s from "../espace.module.css";
import Icon from "../../Icon";
import PageContenu from "../PageContenu";
import { B, RubanEtats } from "../Coquille";
import Formulaire from "./Formulaire";

export const metadata: Metadata = { title: "Contact — XwézanEvent" };

/**
 * Contact (preview V2). Texte et coordonnées repris de app/(public)/contact.
 * Page d'action : colonne alignée à gauche. ?etat=envoye | erreur.
 */
export default function V2Contact({ searchParams }: { searchParams: { etat?: string } }) {
  return (
    <>
      <PageContenu
        surtitre="Contact"
        titre={
          <>
            On est là <em>pour t&apos;aider.</em>
          </>
        }
        intro="Une question sur un billet, un événement, ou juste envie de nous dire bonjour ? Écris-nous, on te répond directement."
        avant={
          <ul className={s.deux} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", listStyle: "none", padding: 0, margin: 0 }}>
            <li className={s.carte}>
              <span className={s.note} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Icon name="mail" size={16} /> Email
              </span>
              <a href="mailto:contact@xwezan.com" style={{ fontWeight: 700, fontSize: 17 }}>
                contact@xwezan.com
              </a>
            </li>
            <li className={s.carte}>
              <span className={s.note} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Icon name="phone" size={16} /> WhatsApp
              </span>
              <a href="https://wa.me/22953064872" target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: 17 }}>
                +229 53 06 48 72
              </a>
            </li>
          </ul>
        }
        sections={[
          {
            id: "message",
            titre: "Envoie-nous un message",
            contenu: <Formulaire envoyeInitial={searchParams.etat === "envoye"} erreurInitiale={searchParams.etat === "erreur"} />,
          },
        ]}
      />
      <div style={{ padding: "0 16px" }}>
        <RubanEtats chemin={`${B}/contact`} etats={["normal", "envoye", "erreur"]} />
      </div>
    </>
  );
}
