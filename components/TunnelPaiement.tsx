"use client";

import { useState } from "react";
import Image from "next/image";

export interface LigneCommande {
  nom: string;
  qte: number;
  montant: number; // prix unitaire × qte
}

export interface TunnelProps {
  titre: string;
  dateHeure: string;
  lieu: string;
  affiche: string;
  lignes: LigneCommande[];
  sousTotal: number;
  frais: number;
  total: number;
}

type Moyen = "mtn" | "moov" | "carte";

function fmt(n: number): string {
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

const MOYENS: { id: Moyen; ico: string; nom: string; sous: string }[] = [
  { id: "mtn", ico: "📱", nom: "MTN Money", sous: "Paiement mobile" },
  { id: "moov", ico: "📲", nom: "Moov Money", sous: "Paiement mobile" },
  { id: "carte", ico: "💳", nom: "Carte bancaire", sous: "Visa · Mastercard" },
];

export default function TunnelPaiement({
  titre,
  dateHeure,
  lieu,
  affiche,
  lignes,
  sousTotal,
  frais,
  total,
}: TunnelProps) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [moyen, setMoyen] = useState<Moyen>("mtn");
  const [tel, setTel] = useState("");
  const [carte, setCarte] = useState("");
  const [envoye, setEnvoye] = useState(false);

  const emailOk = /.+@.+\..+/.test(email);
  const detailOk = moyen === "carte" ? carte.trim().length >= 12 : tel.trim().length >= 8;
  const formValide = nom.trim().length > 1 && emailOk && detailOk;

  return (
    <div className="grille-p">
      {/* ------------------------- COLONNE FORMULAIRE ------------------------- */}
      <div>
        <h1>Paiement</h1>

        <div className="section-p">
          <h2>Tes informations</h2>
          <div className="rangee">
            <div className="champ-bloc">
              <label htmlFor="nom">Nom complet</label>
              <input
                id="nom"
                type="text"
                placeholder="Prénom Nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>
            <div className="champ-bloc">
              <label htmlFor="mail">
                Email <small>(pour recevoir le billet)</small>
              </label>
              <input
                id="mail"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="section-p">
          <h2>Moyen de paiement</h2>
          <div className="moyens" role="group" aria-label="Choisir un moyen de paiement">
            {MOYENS.map((m) => (
              <button
                key={m.id}
                type="button"
                className="moyen-p"
                aria-pressed={moyen === m.id}
                onClick={() => setMoyen(m.id)}
              >
                <div className="ico">{m.ico}</div>
                <div className="n">{m.nom}</div>
                <div className="s">{m.sous}</div>
              </button>
            ))}
          </div>

          {moyen === "mtn" && (
            <div>
              <div className="champ-bloc">
                <label htmlFor="num-mtn">Numéro MTN Money</label>
                <input
                  id="num-mtn"
                  type="tel"
                  placeholder="+229 01 XX XX XX XX"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                />
              </div>
              <p className="note-momo">
                📳 Après avoir cliqué sur « Payer », valide la demande de paiement
                sur ton téléphone (invite USSD MTN).
              </p>
            </div>
          )}

          {moyen === "moov" && (
            <div>
              <div className="champ-bloc">
                <label htmlFor="num-moov">Numéro Moov Money</label>
                <input
                  id="num-moov"
                  type="tel"
                  placeholder="+229 01 XX XX XX XX"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                />
              </div>
              <p className="note-momo">
                📳 Après avoir cliqué sur « Payer », valide la demande de paiement
                sur ton téléphone (invite USSD Moov).
              </p>
            </div>
          )}

          {moyen === "carte" && (
            <div>
              <p className="note-momo">
                🌍 Idéal pour les visiteurs — paiement international accepté.
              </p>
              <div className="champ-bloc">
                <label htmlFor="num-cb">Numéro de carte</label>
                <input
                  id="num-cb"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={carte}
                  onChange={(e) => setCarte(e.target.value)}
                />
              </div>
              <div className="logos-cb">
                <span className="logo-cb">VISA</span>
                <span className="logo-cb">MASTERCARD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------- RÉCAP COMMANDE --------------------------- */}
      <aside className="recap" aria-label="Récapitulatif de la commande">
        <div className="ev">
          <Image
            className="vignette"
            src={affiche}
            alt={titre}
            width={74}
            height={74}
          />
          <div>
            <h3>{titre}</h3>
            <p>
              📅 {dateHeure}
              <br />
              📍 {lieu}
            </p>
          </div>
        </div>

        {lignes.map((l, i) => (
          <div className="ligne-t" key={i}>
            <span>
              {l.nom} × {l.qte}
            </span>
            <span className="m">{fmt(l.montant)}</span>
          </div>
        ))}
        <div className="ligne-t">
          <span>Sous-total</span>
          <span className="m">{fmt(sousTotal)}</span>
        </div>
        <div className="ligne-t">
          <span>Frais de service (6%)</span>
          <span className="m">{fmt(frais)}</span>
        </div>
        <div className="ligne-t total">
          <span>Total</span>
          <span className="m">{fmt(total)}</span>
        </div>

        <button
          type="button"
          className="btn btn-or btn-large"
          disabled={!formValide || envoye}
          onClick={() => setEnvoye(true)}
        >
          {envoye ? "Traitement…" : `Payer ${fmt(total)}`}
        </button>

        {envoye ? (
          <p className="note-paiement">
            ✓ Récapitulatif validé. L&apos;encaissement Mobile Money via FedaPay
            sera activé prochainement (nécessite la connexion à ton compte).
          </p>
        ) : (
          <p className="securise">🔒 Paiement sécurisé via FedaPay</p>
        )}
      </aside>
    </div>
  );
}
