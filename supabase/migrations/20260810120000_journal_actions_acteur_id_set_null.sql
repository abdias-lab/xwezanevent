-- journal_actions.acteur_id référence profiles(id) sans ON DELETE CASCADE
-- ni SET NULL (juste RESTRICT implicite) — contrairement à payouts et
-- events, déjà en ON DELETE CASCADE. Découvert en creusant l'échec
-- silencieux de la suppression d'un compte de test le 2026-08-10 (voir
-- COMPTES_TEST.md, suivi du même jour) : deux entrées de journal
-- suffisaient à bloquer la suppression en cascade du profil.
--
-- SET NULL plutôt que CASCADE (à la différence de payouts/events) : le
-- journal est un historique d'audit, pas une donnée métier rattachée au
-- compte — on veut garder la trace de l'action même après suppression du
-- compte de l'acteur (organisateur qui ferme son compte, nettoyage d'un
-- compte de test, etc.), pas la perdre avec lui. `detail` (JSONB) conserve
-- déjà les identifiants utiles (event_id, payout_id...) de l'action même
-- une fois acteur_id à NULL.
--
-- DROP NOT NULL indispensable : une contrainte SET NULL ne peut pas
-- s'appliquer à une colonne qui refuse explicitement NULL. Aucun code
-- actuel ne lit journal_actions en supposant acteur_id non-NULL (table
-- write-only pour l'instant, pas encore de page admin qui l'affiche) —
-- sûr à desserrer.
--
-- Nom de la contrainte FK jamais fixé explicitement (REFERENCES inline à
-- la création de la table) : on la retrouve dynamiquement via
-- pg_constraint, même pattern que 20260718130000_ajoute_celtiis_payouts.sql,
-- pour que cette migration reste fiable et rejouable sans dépendre d'un nom
-- deviné.

ALTER TABLE public.journal_actions ALTER COLUMN acteur_id DROP NOT NULL;

DO $$
DECLARE
  contrainte TEXT;
BEGIN
  SELECT conname INTO contrainte
  FROM pg_constraint
  WHERE conrelid = 'public.journal_actions'::regclass
    AND contype = 'f'
    AND pg_get_constraintdef(oid) ILIKE '%acteur_id%';

  IF contrainte IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.journal_actions DROP CONSTRAINT %I', contrainte);
  END IF;
END $$;

ALTER TABLE public.journal_actions
  ADD CONSTRAINT journal_actions_acteur_id_fkey
  FOREIGN KEY (acteur_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
