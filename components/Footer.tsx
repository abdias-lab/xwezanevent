import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="foot">
        <div className="foot-haut">
          <div>
            <Link href="/" className="logo" aria-label="XwézanEvent">
              <span className="mark" aria-hidden="true" />
              Xwézan<em>Event</em>
            </Link>
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
              <span className="moyen">💳 Carte bancaire</span>
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
              <li><Link href="/tarifs">Tarifs — 6% tout compris</Link></li>
              <li><Link href="/scan">Scan &amp; contrôle d&apos;accès</Link></li>
              <li><Link href="/reversements">Reversements Mobile Money</Link></li>
            </ul>
          </div>

          <div>
            <h4>Aide</h4>
            <ul>
              <li><Link href="/billet">Retrouver mon billet</Link></li>
              <li><Link href="/remboursements">Remboursements</Link></li>
              <li><Link href="/contact">Nous contacter</Link></li>
              <li><Link href="/cgu">CGU &amp; confidentialité</Link></li>
            </ul>
          </div>
        </div>

        <div className="foot-bas">
          <span>© 2026 XwézanEvent — Cotonou, Bénin</span>
          <span className="fon">Mì wá djawá !&nbsp;· La fête vous attend.</span>
        </div>
      </div>
    </footer>
  );
}
