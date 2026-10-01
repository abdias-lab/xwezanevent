-- Correctif d'incident du 2026-10-01 : toutes les pages événement en 404.
--
-- La migration 20261001120000_artistes_abonnements.sql a créé
-- notifications_nouvelle_date (event_id → events, user_id → profiles, clé
-- primaire sur les deux). PostgREST l'a prise pour une table de liaison entre
-- events et profiles : l'embarquement organisateur:profiles(...) depuis
-- events est devenu ambigu (PGRST201), getEvenementParSlug renvoyait null et
-- chaque page événement répondait 404 (achats impossibles). Appliqué en
-- urgence par Abdias dans le SQL Editor, le 2026-10-01.
--
-- Correctif : la clé vers profiles n'est pas nécessaire à ce journal
-- anti-doublon (lot 3) ; sans elle, il n'existe plus qu'un chemin entre
-- events et profiles (events.organisateur_id). Le code nomme désormais aussi
-- la clé dans ses embarquements (profiles!organisateur_id), par sécurité.
-- IF EXISTS : la table n'existe pas sur une base qui n'a pas encore reçu la
-- migration des artistes.

ALTER TABLE IF EXISTS public.notifications_nouvelle_date
  DROP CONSTRAINT IF EXISTS notifications_nouvelle_date_user_id_fkey;
NOTIFY pgrst, 'reload schema';

-- Vérification : doit renvoyer 0 ligne.
SELECT conname FROM pg_constraint
WHERE conrelid = to_regclass('public.notifications_nouvelle_date')
  AND confrelid = 'public.profiles'::regclass;
