-- Bande "ticker" de la page d'accueil : événements choisis manuellement par
-- l'admin (au lieu d'un tableau en dur côté front). Un événement n'apparaît
-- dans le ticker que s'il est ET mis_en_avant=true ET éligible (statut
-- 'publie', date_debut à venir) — voir lib/events.ts:getEvenementsTicker().
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS mis_en_avant BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ordre_affiche SMALLINT;

-- N'indexe que les lignes mises en avant : table filtrée, index minuscule.
CREATE INDEX IF NOT EXISTS idx_events_mis_en_avant
  ON public.events (mis_en_avant)
  WHERE mis_en_avant = true;
