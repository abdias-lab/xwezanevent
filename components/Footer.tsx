import Link from "next/link";
import Logo from "@/components/Logo";
import SelecteurPays from "@/components/SelecteurPays";
import { getPaysActifs, getPaysActuel } from "@/lib/pays";

export default async function Footer() {
  const paysActifs = await getPaysActifs();
  const paysActuel = getPaysActuel();

  return (
    <footer className="footer">
      <div className="foot">
        <div className="foot-haut">
          <div>
            <Logo />
            <p className="pitch">
              La billetterie en ligne du Bénin. Découvrez, réservez, vibrez —
              payez comme vous vivez, en Mobile Money.
            </p>
            <div className="paiements">
              <span className="moyen">
                <span className="dot-mtn" aria-hidden="true" />
                MTN MoMo
              </span>
              <span className="moyen">
                <span className="dot-moov" aria-hidden="true" />
                Moov Money
              </span>
              <span className="moyen">
                <span className="dot-celtiis" aria-hidden="true" />
                Celtiis Money
              </span>
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
            <span>XwézanEvent by Digiflow</span>
            <span className="sep" aria-hidden="true">·</span>
            <span>Cotonou — N° RCCM RB/COT/24 A 104638</span>
            <span className="sep" aria-hidden="true">·</span>
            <span>N° IFU 1201526575807</span>
            <span className="sep" aria-hidden="true">·</span>
            <span>
              WhatsApp :{" "}
              <a href="https://wa.me/22953064872" target="_blank" rel="noopener noreferrer">
                +229 53 06 48 72
              </a>
            </span>
            <span className="sep" aria-hidden="true">·</span>
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
