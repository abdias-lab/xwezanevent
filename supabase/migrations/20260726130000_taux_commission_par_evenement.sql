-- Commission variable par événement. Jusqu'ici 6% était codé en dur à
-- plusieurs endroits (lib/payouts.ts, app/(orga)/orga/page.tsx,
-- app/(admin)/admin/commissions/page.tsx, app/(admin)/admin/page.tsx) —
-- impossible d'honorer un accord commercial particulier (ex. commission
-- offerte sur le premier événement d'un organisateur) sans ce champ.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS taux_commission NUMERIC(4,3) NOT NULL DEFAULT 0.06
  CHECK (taux_commission >= 0 AND taux_commission <= 1);

-- Verrou : la policy "Organisateurs can update their own events" n'a aucune
-- restriction de colonne (comme est_demo, voir migration 20260722120000) —
-- sans ce verrou un organisateur pourrait mettre SA PROPRE commission à 0
-- via un appel direct à l'API PostgREST. Aucun chemin de l'app n'écrit sur
-- `events` autrement que via supabaseAdmin (service_role) dans des routes
-- serveur avec contrôle d'accès explicite — seul service_role doit donc
-- pouvoir écrire ce champ.
REVOKE UPDATE (taux_commission) ON public.events FROM authenticated;
REVOKE UPDATE (taux_commission) ON public.events FROM anon;

-- Accord commercial : commission offerte sur le premier événement de
-- l'organisateur Jospin (voir échange avec Abdias du 2026-07-26).
UPDATE public.events
SET taux_commission = 0
WHERE slug = 'concours-voice-talent-africa';
