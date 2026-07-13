-- Rate limiting simple (1 demande par email par 15 minutes) pour la
-- fonctionnalité "Retrouver mon billet" (/billet) : évite le spam de
-- renvoi d'emails de confirmation.
-- Date: 2026-07-13

CREATE TABLE IF NOT EXISTS public.demandes_retrouver_billet (
  email TEXT PRIMARY KEY,
  derniere_demande TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.demandes_retrouver_billet ENABLE ROW LEVEL SECURITY;

-- Aucune policy définie : avec RLS activée et zéro policy, anon et
-- authenticated n'ont accès à rien sur cette table. Seul service_role
-- (qui bypass RLS nativement) peut lire/écrire — utilisé exclusivement par
-- app/api/billets/retrouver/route.ts via supabaseAdmin.
