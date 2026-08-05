"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { changerPays } from "@/lib/pays-action";
import type { PaysOption } from "@/lib/pays";

/**
 * Sélecteur de contexte pays (drapeau) — change le filtrage du catalogue
 * public (accueil, /evenements), JAMAIS le pays d'un événement individuel.
 * N'affiche rien tant qu'un seul pays est actif (voir lib/pays.ts) :
 * invisible aujourd'hui, apparaît de lui-même dès qu'un second pays passe
 * actif=true, sans changement de code.
 *
 * Utilisé à la fois dans components/Header.tsx (nav desktop) et
 * components/MenuBurger.tsx (nav mobile), même props des deux côtés —
 * même principe que BoutonDeconnexion, déjà dupliqué ainsi.
 */
export default function SelecteurPays({
  paysActifs,
  paysActuel,
}: {
  paysActifs: PaysOption[];
  paysActuel: string;
}) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  if (paysActifs.length <= 1) return null;

  const actif = paysActifs.find((p) => p.code === paysActuel) ?? paysActifs[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        className="connexion"
        aria-haspopup="true"
        aria-expanded={ouvert}
        aria-label={`Changer de pays (actuellement ${actif.nom})`}
        onClick={() => setOuvert((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      >
        <span aria-hidden="true">{actif.drapeau}</span>
        <span aria-hidden="true" style={{ fontSize: "0.7em" }}>▾</span>
      </button>

      {ouvert && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            background: "#1f1710",
            border: "1px solid rgba(228,169,63,0.25)",
            borderRadius: 12,
            padding: 6,
            minWidth: 160,
            zIndex: 50,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {paysActifs.map((p) => (
            <form action={changerPays} key={p.code} onSubmit={() => setOuvert(false)}>
              <input type="hidden" name="pays_code" value={p.code} />
              <input type="hidden" name="chemin" value={pathname} />
              <button
                type="submit"
                role="menuitem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  background: p.code === paysActuel ? "rgba(228,169,63,0.12)" : "transparent",
                  border: "none",
                  borderRadius: 8,
                  color: "#f3eada",
                  fontSize: "0.9rem",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span aria-hidden="true">{p.drapeau}</span>
                {p.nom}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
