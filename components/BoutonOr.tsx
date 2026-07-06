import Link from "next/link";

interface BoutonOrProps {
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}

/**
 * Bouton principal doré du design system XwézanEvent.
 * Rendu <Link> si `href` est fourni, sinon <button>.
 */
export default function BoutonOr({
  href,
  type = "button",
  onClick,
  children,
  className = "",
  ...rest
}: BoutonOrProps) {
  const classes = `btn btn-or ${className}`.trim();

  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} {...rest}>
      {children}
    </button>
  );
}
