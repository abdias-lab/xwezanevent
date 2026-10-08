-- Image de couverture d'un artiste (décision d'Abdias du 2026-10-09).
--
-- Bandeau de la page artiste, repli en cascade : couverture fournie
-- (affichée nette) → sinon photo de profil floutée → sinon dégradé.
-- Envoyée depuis /orga/artistes par le compte qui gère l'artiste (même
-- compression navigateur et même bucket « affiches » que les affiches) ;
-- l'admin peut la supprimer seule, sans retirer l'artiste (trace au journal
-- d'actions, pas de colonne).
--
-- Colonne publique, comme photo_url : ajoutée au GRANT SELECT par colonne
-- de 20261001120000 (lisible par anon/authenticated sur les artistes
-- validés, policy inchangée). Aucune écriture depuis le navigateur : tout
-- passe par supabaseAdmin. Aucune clé étrangère ajoutée (pas d'effet sur
-- les embarquements PostgREST).
--
-- À vérifier après application : ouvrir une page événement publiée.

BEGIN;

ALTER TABLE public.artistes
  ADD COLUMN IF NOT EXISTS couverture_url TEXT CHECK (couverture_url IS NULL OR char_length(couverture_url) <= 500);

GRANT SELECT (couverture_url) ON public.artistes TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérifications :
-- 1. la colonne, lisible par les clients, non modifiable :
SELECT r AS role,
       has_column_privilege(r, 'public.artistes', 'couverture_url', 'SELECT') AS lecture,
       has_column_privilege(r, 'public.artistes', 'couverture_url', 'UPDATE') AS ecriture
FROM unnest(ARRAY['anon', 'authenticated']) AS r;
-- Attendu : lecture true, ecriture false.
-- 2. toujours trois clés de artistes vers profiles (aucune ajoutée) :
SELECT conname FROM pg_constraint WHERE conrelid = 'public.artistes'::regclass AND confrelid = 'public.profiles'::regclass;
