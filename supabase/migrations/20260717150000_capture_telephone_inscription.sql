-- Corrige un bug fonctionnel découvert en traitant E2 (audit sécurité) :
-- le formulaire d'inscription (components/AuthForm.tsx) collecte bien un
-- numéro de téléphone ("pour Mobile Money") et le transmet via
-- `supabase.auth.signUp({ options: { data: { telephone } } })`, mais
-- handle_new_user() (corrigée dans 20260708120000_fix_handle_new_user_search_path.sql)
-- insère `NULL` en dur au lieu de le lire dans raw_user_meta_data. Le
-- téléphone n'a donc jamais été enregistré pour aucun utilisateur.
--
-- raw_user_meta_data est fourni par le client (appel direct à l'API Auth
-- Supabase, aucune route serveur à nous ne s'interpose) : on n'y fait
-- aucune confiance.
--   - TRIM() : au minimum, pas d'espaces superflus.
--   - LEFT(..., 32) : la colonne `telephone` n'a aucune contrainte de
--     longueur ; on plafonne pour éviter qu'un appel direct à l'API
--     (hors formulaire) n'y stocke une chaîne arbitrairement longue.
--   - NULLIF(..., '') : une chaîne vide après trim redevient NULL,
--     cohérent avec la sémantique "pas de téléphone" utilisée ailleurs
--     (affichage admin en "—").
--   Aucune validation de FORMAT n'est faite ici (pas de regex E.164/local) :
--   c'est un chantier à part, à traiter avec la validation du formulaire
--   lui-même (actuellement absente côté serveur — seul un `type="tel"`
--   HTML existe, purement cosmétique).
--
-- SECURITY DEFINER conservé avec SET search_path = public. Cette fonction
-- n'a jamais eu de REVOKE/GRANT déclaré (trigger déclenché par
-- supabase_auth_admin via on_auth_user_created, jamais appelée directement
-- par un rôle client) : rien à re-déclarer ici.
--
-- Pour les 6 comptes existants déjà créés avec telephone NULL : aucune
-- action en base dans cette migration (décision produit à prendre
-- séparément sur le moment où les leur redemander).

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
    NULLIF(LEFT(TRIM(NEW.raw_user_meta_data->>'telephone'), 32), ''),
    'visiteur'
  );
  RETURN NEW;
END;
$$;
