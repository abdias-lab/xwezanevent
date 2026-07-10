import MotDePasseOublieForm from "@/components/MotDePasseOublieForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié — XwézanEvent",
};

export default function MotDePasseOublie() {
  return (
    <div className="split">
      <div className="marque">
        <div className="applique" aria-hidden="true" />
        <div style={{ position: "relative" }}>
          <span className="eyebrow">La billetterie du Bénin</span>
          <h1>
            Rejoins la scène <span className="fete">béninoise.</span>
          </h1>
          <p>
            Concerts, festivals, Vodun Days, WeLovEya — tout le Bénin dans ta
            poche, un billet à la fois.
          </p>
        </div>
      </div>

      <div className="cote-form">
        <MotDePasseOublieForm />
      </div>
    </div>
  );
}
