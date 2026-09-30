import type { Metadata } from "next";
import s from "@/components/v2/espace.module.css";
import Icon from "@/components/v2/Icon";
import PageContenu from "@/components/v2/public/PageContenu";
import FormulaireContact from "@/components/v2/public/FormulaireContact";

export const metadata: Metadata = {
  title: "Contact — XwézanEvent",
  description: "Une question ? Écris-nous ou contacte-nous directement.",
};

/**
 * Contact (V2), reprise de la preview (v2/contact). Texte et coordonnées
 * inchangés. Page d'action : colonne alignée à gauche.
 */
export default function Contact() {
  return (
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
          id: "formulaire", // pas « message » : c'est déjà l'id du champ du formulaire
          titre: "Envoie-nous un message",
          contenu: <FormulaireContact />,
        },
      ]}
    />
  );
}
