import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FormulaireContact from "@/components/FormulaireContact";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — XwézanEvent",
  description: "Une question ? Écris-nous ou contacte-nous directement.",
};

export default function Contact() {
  return (
    <>
      <Header />

      <main className="page-info">
        <span className="eyebrow">Contact</span>
        <h1>On est là pour t&apos;aider</h1>
        <p className="intro">
          Une question sur un billet, un événement, ou juste envie de nous
          dire bonjour ? Écris-nous, on te répond directement.
        </p>

        <div className="contact-grille">
          <div className="contact-carte">
            <span className="ic">✉️</span>
            <h3>Email</h3>
            <a href="mailto:contact@xwezan.com">contact@xwezan.com</a>
          </div>
          <div className="contact-carte">
            <span className="ic">💬</span>
            <h3>WhatsApp</h3>
            <a href="https://wa.me/22953064872" target="_blank" rel="noopener noreferrer">
              +229 53 06 48 72
            </a>
          </div>
        </div>

        <div className="bloc">
          <h2>Envoie-nous un message</h2>
          <FormulaireContact />
        </div>
      </main>

      <Footer />
    </>
  );
}
