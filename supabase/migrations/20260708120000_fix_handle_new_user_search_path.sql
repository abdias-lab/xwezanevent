-- Supabase SQL Migration : correctif handle_new_user
-- Date : 2026-07-08
--
-- BUG :
--   Le trigger on_auth_user_created appelle handle_new_user() lors de la création
--   d'un utilisateur. Cette fonction s'exécute dans le contexte de GoTrue, dont le
--   rôle (supabase_auth_admin) a pour search_path « auth » — et NON « public ».
--   La fonction référence « profiles » sans qualification de schéma et sans
--   search_path fixé : Postgres ne trouve donc pas public.profiles et lève une
--   erreur. Résultat : TOUTE création d'utilisateur échoue avec
--   « Database error creating new user » (HTTP 500 côté Auth admin API).
--
-- CORRECTIF :
--   Recréer la fonction avec un search_path épinglé (SET search_path = public) et
--   des noms de tables pleinement qualifiés (public.profiles). Pattern recommandé
--   par Supabase pour les fonctions SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nom, telephone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', NEW.email),
    NULL,
    'visiteur'
  );
  RETURN NEW;
END;
$$;

-- Le trigger on_auth_user_created existant continue de pointer sur cette fonction,
-- inutile de le recréer.
