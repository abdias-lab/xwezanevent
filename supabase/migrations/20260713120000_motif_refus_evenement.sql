-- Motif de refus admin, affiché/envoyé par email à l'organisateur.
-- Date: 2026-07-13

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS motif_refus TEXT;
