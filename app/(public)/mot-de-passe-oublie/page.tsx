import MotDePasseOublieForm from "@/components/MotDePasseOublieForm";
import PanneauMarketing from "@/components/PanneauMarketing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mot de passe oublié — XwézanEvent",
};

export default function MotDePasseOublie() {
  return (
    <div className="split">
      <PanneauMarketing />

      <div className="cote-form">
        <MotDePasseOublieForm />
      </div>
    </div>
  );
}
