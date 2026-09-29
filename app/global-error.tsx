"use client";

import Erreur500 from "@/components/v2/public/Erreur500";

/**
 * Dernier recours (V2) : erreur dans la mise en page racine elle-même. Elle
 * est alors remplacée entièrement, d'où <html> et <body> fournis ici.
 */
export default function ErreurGlobale({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body>
        <Erreur500 error={error} reset={reset} />
      </body>
    </html>
  );
}
