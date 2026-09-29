"use client";

import Erreur500 from "@/components/v2/public/Erreur500";

/**
 * Erreur d'une page (V2) : remplace la page par défaut de Next.js, en anglais
 * (design/BUGS_REFONTE.md, A6). Rendue dans la mise en page racine.
 */
export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Erreur500 error={error} reset={reset} />;
}
