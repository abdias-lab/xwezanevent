type Styles = Record<string, string>;

/**
 * Illustration des pages d'erreur V2 (reprise de preview-design/BilletErreur.tsx) : un billet au trait doré, le code
 * imprimé sur le corps, dont le talon oscille lentement (3,6 s, en boucle),
 * comme s'il pendait. Immobile avec prefers-reduced-motion. Décoratif.
 */
export default function BilletErreur({ code, s }: { code: string; s: Styles }) {
  return (
    <svg className={s.billetErreur} viewBox="0 0 200 110" role="presentation" aria-hidden="true" focusable="false">
      <path className={s.billetCorps} d="M16 10H134A6 6 0 0 0 140 16V94A6 6 0 0 0 134 100H16Q10 100 10 94V16Q10 10 16 10Z" />
      <text className={s.billetCode} x="75" y="55" textAnchor="middle" dominantBaseline="central">
        {code}
      </text>
      <line className={s.billetPerfo} x1="140" y1="20" x2="140" y2="90" />
      <g className={s.billetTalon}>
        <path className={s.billetCorps} d="M146 10H184Q190 10 190 16V94Q190 100 184 100H146A6 6 0 0 0 140 94V16A6 6 0 0 0 146 10Z" />
        <path className={s.billetTraits} d="M157 32h22M157 44h22M157 56h14" />
      </g>
    </svg>
  );
}
