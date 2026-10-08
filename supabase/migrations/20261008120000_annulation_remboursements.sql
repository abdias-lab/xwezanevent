-- Annulation d'un événement : e-mail aux acheteurs et remboursements traçables
-- (design/BUGS_REFONTE.md n°7, décisions d'Abdias du 2026-10-08).
--
-- 1. orders : qui a marqué la commande remboursée, quand, et la référence de
--    l'opération Mobile Money. C'est le justificatif si un acheteur conteste.
--    rembourse_par n'a VOLONTAIREMENT pas de clé étrangère vers profiles :
--    orders a déjà user_id → profiles, et le code embarque orders → profiles
--    (/admin/billets, fiche organisateur). Une deuxième clé rendrait cet
--    embarquement ambigu pour PostgREST et casserait ces pages (incident
--    n°26). Le nom de l'admin est figé dans rembourse_par_nom : le justificatif
--    survit à la suppression de son compte.
-- 2. notifications_annulation : registre des e-mails d'annulation, une ligne
--    par commande, écrite APRÈS l'envoi réussi (lib/annulation-emails.ts) ;
--    une relance ne sert que les commandes non marquées. Une seule clé
--    étrangère (orders) : aucun nouveau chemin entre tables pour PostgREST.
-- 3. marquer_rembourse_annulation : passage « paye » → « rembourse » d'une
--    commande d'un événement annulé, avec sa trace, sous verrou.
--
-- À vérifier après application : ouvrir une page événement publiée et
-- /admin/billets (embarquements orders → profiles).

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS rembourse_le        TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rembourse_par       UUID,
  ADD COLUMN IF NOT EXISTS rembourse_par_nom   TEXT CHECK (rembourse_par_nom IS NULL OR char_length(rembourse_par_nom) <= 200),
  ADD COLUMN IF NOT EXISTS rembourse_reference TEXT CHECK (rembourse_reference IS NULL OR char_length(rembourse_reference) <= 100);

CREATE TABLE IF NOT EXISTS public.notifications_annulation (
  order_id   UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  envoye_le  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.notifications_annulation ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications_annulation FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.marquer_rembourse_annulation(
  p_order_id  UUID,
  p_admin_id  UUID,
  p_admin_nom TEXT,
  p_reference TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut       TEXT;
  v_statut_event TEXT;
BEGIN
  SELECT o.statut, e.statut
    INTO v_statut, v_statut_event
    FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
   WHERE o.id = p_order_id
     FOR UPDATE OF o;
  IF NOT FOUND THEN
    RETURN 'introuvable';
  END IF;
  IF v_statut_event <> 'annule' THEN
    RETURN 'evenement_pas_annule';
  END IF;
  IF v_statut <> 'paye' THEN
    RETURN 'pas_payee';
  END IF;

  UPDATE public.orders
     SET statut              = 'rembourse',
         rembourse_le        = NOW(),
         rembourse_par       = p_admin_id,
         rembourse_par_nom   = left(p_admin_nom, 200),
         rembourse_reference = NULLIF(left(btrim(p_reference), 100), '')
   WHERE id = p_order_id;

  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marquer_rembourse_annulation(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.marquer_rembourse_annulation(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.marquer_rembourse_annulation(UUID, UUID, TEXT, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.marquer_rembourse_annulation(UUID, UUID, TEXT, TEXT) TO   service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérifications :
-- 1. les quatre colonnes de traçabilité :
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND column_name LIKE 'rembourse_%' ORDER BY 1;
-- 2. aucun accès client au registre, exécution réservée au service_role :
SELECT r AS role,
       has_table_privilege(r, 'public.notifications_annulation', 'SELECT') AS registre_lecture,
       has_function_privilege(r, 'public.marquer_rembourse_annulation(uuid, uuid, text, text)', 'EXECUTE') AS execution
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r;
-- Attendu : tout à false pour anon et authenticated, execution = true pour service_role.
-- 3. une seule clé étrangère de orders vers profiles (user_id) :
SELECT conname FROM pg_constraint
WHERE conrelid = 'public.orders'::regclass AND confrelid = 'public.profiles'::regclass;
