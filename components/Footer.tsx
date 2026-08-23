import Link from "next/link";
import Logo from "@/components/Logo";
import SelecteurPays from "@/components/SelecteurPays";
import { getPaysActifs, getPaysActuel } from "@/lib/pays";
import { operateursPays } from "@/lib/telephone";

export default async function Footer() {
  const paysActifs = await getPaysActifs();
  const paysActuel = await getPaysActuel();
  const paysActuelDetail = paysActifs.find((p) => p.code === paysActuel);
  const nomPays = paysActuelDetail?.nom ?? "Bénin";
  const operateurs = operateursPays(paysActuel);

  return (
    <footer className="footer">
      <div className="foot">
        <div className="foot-haut">
          <div>
            <Logo />
            <p className="pitch">
              La billetterie en ligne du {nomPays}. Découvrez, réservez, vibrez —
              payez comme vous vivez, en Mobile Money.
            </p>
            <div className="paiements">
              {operateurs.map((o) => (
                <span className="moyen" key={o.code}>
                  <span className={`dot-${o.code}`} aria-hidden="true" />
                  {o.nom}
                </span>
              ))}
            </div>

            <div className="reseaux">
              <h4>Sur les réseaux</h4>
              <div className="reseaux-icones">
                <a
                  href="https://wa.me/22953064872"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="XwézanEvent sur WhatsApp"
                  title="+229 53 06 48 72"
                  className="reseau-lien"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 21l1.6-4.8A8.5 8.5 0 1 1 8.4 19.6L3 21Z" />
                    <path
                      d="M8.5 9.5c0 3.5 3 6.5 6.5 6.5.4 0 .8-.3.9-.7l.3-1.2c.1-.4-.1-.8-.5-1l-1.7-.8c-.3-.2-.7-.1-1 .2l-.5.6c-1.1-.5-2-1.4-2.5-2.5l.6-.5c.3-.3.3-.7.2-1l-.8-1.7c-.2-.4-.6-.6-1-.5l-1.2.3c-.4.1-.7.5-.7.9Z"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                </a>
                <a
                  href="https://instagram.com/xwezan_event"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="XwézanEvent sur Instagram"
                  className="reseau-lien"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div>
            <h4>Découvrir</h4>
            <ul>
              <li><Link href="/evenements">Tous les événements</Link></li>
              <li><Link href="/evenements?quand=week-end">Ce week-end</Link></li>
              <li><Link href="/#villes">Par ville</Link></li>
              <li><Link href="/#categories">Par catégorie</Link></li>
            </ul>
          </div>

          <div>
            <h4>Organisateurs</h4>
            <ul>
              <li><Link href="/creer">Créer un événement</Link></li>
              <li><Link href="/tarifs">Tarifs — 8% tout compris</Link></li>
              <li><Link href="/scan">Scan &amp; contrôle d&apos;accès</Link></li>
              <li><Link href="/reversements">Reversements Mobile Money</Link></li>
            </ul>
          </div>

          <div>
            <h4>Aide</h4>
            <ul>
              <li><Link href="/faq">FAQ</Link></li>
              <li><Link href="/billet">Retrouver mon billet</Link></li>
              <li><Link href="/remboursements">Remboursements</Link></li>
              <li><Link href="/contact">Nous contacter</Link></li>
              <li><Link href="/cgu">CGU &amp; confidentialité</Link></li>
            </ul>
          </div>
        </div>

        <div className="foot-bas">
          <div className="foot-legal">
            <div className="foot-legal-texte">
              <span>XwézanEvent by Digiflow</span>
              <span className="sep" aria-hidden="true">·</span>
              <span>Cotonou — N° RCCM RB/COT/24 A 104638</span>
              <span className="sep" aria-hidden="true">·</span>
              <span>N° IFU 1201526575807</span>
            </div>
            <SelecteurPays paysActifs={paysActifs} paysActuel={paysActuel} />
          </div>
          <div className="foot-bas-ligne">
            <span>© 2026 XwézanEvent — Cotonou, Bénin</span>
            <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
