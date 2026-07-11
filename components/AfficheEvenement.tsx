import Image from "next/image";

type AfficheEvenementProps =
  | {
      src: string | null;
      alt: string;
      className?: string;
      fill: true;
      width?: undefined;
      height?: undefined;
      sizes?: string;
      priority?: boolean;
    }
  | {
      src: string | null;
      alt: string;
      className?: string;
      fill?: false;
      width: number;
      height: number;
      sizes?: string;
      priority?: boolean;
    };

/**
 * Affiche d'événement avec repli élégant (dégradé + pictogramme) quand
 * l'événement n'a pas d'affiche_url. `className` doit porter les règles de
 * positionnement/dimension existantes (ex. "photo", "vignette") : elles
 * s'appliquent aussi bien à l'<Image> qu'au repli.
 */
export default function AfficheEvenement(props: AfficheEvenementProps) {
  const { src, alt, className } = props;

  if (!src) {
    return (
      <div
        className={["sans-affiche", className].filter(Boolean).join(" ")}
        style={props.fill ? undefined : { width: props.width, height: props.height }}
        role="img"
        aria-label={alt}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      </div>
    );
  }

  if (props.fill) {
    return (
      <Image
        className={className}
        src={src}
        alt={alt}
        fill
        sizes={props.sizes}
        priority={props.priority}
      />
    );
  }
  return (
    <Image
      className={className}
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      priority={props.priority}
    />
  );
}
