-- Retrait et suppression d'un artiste par l'admin (décisions d'Abdias du 2026-10-08).
--
-- 1. Statut 'retire' : page publique en 404 (la policy de lecture et le code
--    n'acceptent que 'valide'), absent des sections « Avec », plus d'e-mail
--    « nouvelle date ». La fiche, ses rattachements et ses abonnements
--    restent en base : réversible (retour à 'valide').
-- 2. Trace du retrait sur la fiche : retire_le, retire_par, retire_par_nom
--    (figé), motif_retrait. retire_par sans clé étrangère, comme
--    orders.rembourse_par (n°7) : artistes a déjà trois clés vers profiles
--    (label_id, compte_id, cree_par), une quatrième multiplierait les chemins
--    pour PostgREST ; le nom figé survit à la suppression du compte admin.
--    Colonnes non accordées à anon/authenticated (GRANT SELECT par colonne
--    de 20261001120000) : jamais lisibles depuis le navigateur.
-- 3. supprimer_artiste : suppression définitive, seulement sans aucun
--    rattachement ni abonné. evenement_artistes et abonnements sont
--    supprimés EN CASCADE avec l'artiste : ce contrôle, refait sous verrou au
--    moment de la suppression, est le seul garde-fou contre l'effacement d'une
--    audience. Le verrou FOR UPDATE sur la ligne de l'artiste bloque toute
--    insertion concurrente dans abonnements ou evenement_artistes (leur clé
--    étrangère prend un verrou FOR KEY SHARE sur cette même ligne) : un
--    abonnement en cours est soit vu par le comptage, soit refusé après la
--    suppression, jamais effacé en silence.
--
-- À vérifier après application : ouvrir une page événement publiée.

BEGIN;

DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.artistes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%en_validation%'
  LOOP
    EXECUTE format('ALTER TABLE public.artistes DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.artistes
  ADD CONSTRAINT artistes_statut_check CHECK (statut IN ('en_validation', 'valide', 'refuse', 'retire')),
  ADD COLUMN IF NOT EXISTS retire_le      TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS retire_par     UUID,
  ADD COLUMN IF NOT EXISTS retire_par_nom TEXT CHECK (retire_par_nom IS NULL OR char_length(retire_par_nom) <= 200),
  ADD COLUMN IF NOT EXISTS motif_retrait  TEXT CHECK (motif_retrait IS NULL OR char_length(motif_retrait) <= 1000);

CREATE OR REPLACE FUNCTION public.supprimer_artiste(p_artiste_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_artiste      public.artistes%ROWTYPE;
  v_rattachements INTEGER;
  v_abonnes       INTEGER;
BEGIN
  SELECT * INTO v_artiste FROM public.artistes WHERE id = p_artiste_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('resultat', 'introuvable');
  END IF;

  -- Comptage APRÈS le verrou : tout abonnement ou rattachement validé avant
  -- est vu ; tout nouveau attend la fin de cette transaction.
  SELECT count(*) INTO v_rattachements FROM public.evenement_artistes WHERE artiste_id = p_artiste_id;
  SELECT count(*) INTO v_abonnes FROM public.abonnements WHERE artiste_id = p_artiste_id;
  IF v_rattachements > 0 OR v_abonnes > 0 THEN
    RETURN jsonb_build_object('resultat', 'lie', 'rattachements', v_rattachements, 'abonnes', v_abonnes);
  END IF;

  DELETE FROM public.artistes WHERE id = p_artiste_id;
  RETURN jsonb_build_object(
    'resultat', 'ok',
    'nom', v_artiste.nom_scene,
    'slug', v_artiste.slug,
    'statut', v_artiste.statut,
    'photo_url', v_artiste.photo_url
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.supprimer_artiste(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.supprimer_artiste(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.supprimer_artiste(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.supprimer_artiste(UUID) TO   service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérifications :
-- 1. une seule contrainte de statut, avec 'retire' :
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.artistes'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%statut%';
-- 2. les quatre colonnes, invisibles des clients :
SELECT column_name,
       has_column_privilege('anon', 'public.artistes', column_name, 'SELECT') AS anon_lecture,
       has_column_privilege('authenticated', 'public.artistes', column_name, 'SELECT') AS connecte_lecture
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'artistes' AND column_name IN ('retire_le', 'retire_par', 'retire_par_nom', 'motif_retrait');
-- Attendu : false partout.
-- 3. suppression réservée au service_role :
SELECT r AS role, has_function_privilege(r, 'public.supprimer_artiste(uuid)', 'EXECUTE') AS execution
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r;
-- 4. toujours trois clés de artistes vers profiles (aucune ajoutée) :
SELECT conname FROM pg_constraint WHERE conrelid = 'public.artistes'::regclass AND confrelid = 'public.profiles'::regclass;
