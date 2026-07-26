import Link from "next/link";

/**
 * Logo XwézanEvent — 100% typographique, aucune icône.
 * "Xwézan" en Playfair Display italique gras (doré), "Event" en Instrument Sans (ivoire).
 */
export default function Logo({
  className,
  masquerEvent = false,
}: {
  className?: string;
  /** N'affiche que "Xwézan" (sans "Event" accolé) — réservé au wordmark du header de navigation. */
  masquerEvent?: boolean;
}) {
  return (
    <Link
      href="/"
      className={className ? `logo ${className}` : "logo"}
      aria-label="XwézanEvent — accueil"
    >
      <span className="logo-principal">Xwézan</span>
      {!masquerEvent && <span className="logo-secondaire">Event</span>}
    </Link>
  );
}
