-- Rattrapage des téléphones jamais recopiés vers profiles, alors qu'ils
-- sont bien présents dans auth.users.raw_user_meta_data.
--
-- Constat (2026-08-21) : la migration 20260717150000 corrige
-- handle_new_user() dans le repo, mais son SQL n'a jamais été rejoué dans
-- le SQL Editor Supabase — confirmé directement via
-- `SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user'`, qui
-- montre encore l'ancien NULL en dur. Tous les comptes créés depuis le
-- 2026-07-17, pas seulement ceux d'avant, ont donc telephone = NULL alors
-- que le numéro a bien été saisi et transmis à l'inscription — vérifié
-- pour Jospin (2026-07-25) et AHOUANDJINOU ENOCK / "Hollydays Colors"
-- (2026-07-27) : présent dans raw_user_meta_data, absent de profiles.
--
-- Cette migration ne touche AUCUN compte où le téléphone est légitimement
-- absent (utilisateur ayant laissé le champ vide à l'inscription, ex.
-- "Chef Moo" le 2026-08-19, dont raw_user_meta_data.telephone est une
-- chaîne vide) : la condition sur raw_user_meta_data non vide l'exclut par
-- construction. Ces comptes-là devront redemander le numéro via l'app —
-- hors scope de cette migration.
--
-- Idempotente : ne touche que profiles.telephone IS NULL, sans effet si
-- rejouée. Lecture de auth.users, aucune écriture dessus.
--
-- Prérequis : appliquer 20260717150000_capture_telephone_inscription.sql
-- avant (ou en même temps que) celle-ci, sinon les prochaines inscriptions
-- recreusent le même trou.

UPDATE public.profiles p
SET telephone = NULLIF(LEFT(TRIM(u.raw_user_meta_data->>'telephone'), 32), '')
FROM auth.users u
WHERE p.id = u.id
  AND p.telephone IS NULL
  AND NULLIF(LEFT(TRIM(u.raw_user_meta_data->>'telephone'), 32), '') IS NOT NULL;
