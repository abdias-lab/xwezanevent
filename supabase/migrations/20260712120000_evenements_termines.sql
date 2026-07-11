-- Gestion des événements passés : clôture automatique + refus des ventes
-- et du scan pour un événement dont la date est passée.
-- Date: 2026-07-12
--
-- Fuseau de référence : Africa/Porto-Novo (UTC+1, fixe — pas d'heure d'été
-- au Bénin), partout où on compare à "aujourd'hui".
--
-- Choix d'implémentation pour le passage automatique en statut 'termine' :
-- DEUX mécanismes complémentaires, pas un seul :
--
--   1. pg_cron (ci-dessous) : programme cloturer_evenements_passes() une
--      fois par jour. C'est le mécanisme "propre" qui tient la colonne
--      `statut` à jour sans qu'un humain ait besoin de visiter le site.
--      MAIS pg_cron n'est pas garanti disponible/activé selon le plan
--      Supabase — si `CREATE EXTENSION pg_cron` échoue, ignore ces lignes
--      et active l'extension depuis Database → Extensions dans le
--      dashboard, puis relance uniquement le bloc `SELECT cron.schedule`.
--
--   2. Vérification par DATE (pas par statut) dans le code applicatif —
--      catalogue public (lib/events.ts), création de commande
--      (/api/orders) et scan (valider_billet ci-dessous). C'est le
--      mécanisme qui compte VRAIMENT pour la correction fonctionnelle :
--      même si pg_cron n'a pas encore tourné (ou n'est pas activé du
--      tout), un événement dont la date est passée est immédiatement
--      exclu du catalogue, refusé à l'achat et refusé au scan — la
--      colonne `statut` n'est qu'un affichage de confort pour les
--      dashboards admin/organisateur, jamais la source de vérité pour ces
--      trois vérifications.
--
-- En complément, l'admin appelle aussi cloturer_evenements_passes() à
-- chaque chargement de /admin (voir app/(admin)/admin/page.tsx) : la
-- colonne `statut` se met à jour même si pg_cron n'est pas disponible.

-- ========================================
-- 1. Clôture automatique des événements passés
-- ========================================

CREATE OR REPLACE FUNCTION public.cloturer_evenements_passes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.events
  SET    statut = 'termine'
  WHERE  statut = 'publie'
    AND  date_debut < (now() AT TIME ZONE 'Africa/Porto-Novo')::date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cloturer_evenements_passes() TO   service_role;

-- ========================================
-- 2. pg_cron : exécution quotidienne (facultatif si non disponible)
-- ========================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cloturer-evenements-passes') THEN
    PERFORM cron.unschedule('cloturer-evenements-passes');
  END IF;
END $$;

-- 23:05 UTC = 00:05 Africa/Porto-Novo (UTC+1) : juste après minuit local.
SELECT cron.schedule(
  'cloturer-evenements-passes',
  '5 23 * * *',
  $$ SELECT public.cloturer_evenements_passes(); $$
);

-- ========================================
-- 3. valider_billet() : refuse le scan pour un événement passé
-- ========================================
-- Ajoute la vérification de la date de l'événement (pas seulement du
-- statut du billet) : un billet 'valide' dont l'événement est passé est
-- désormais refusé, même si cloturer_evenements_passes() n'est pas encore
-- passé sur cet événement.

CREATE OR REPLACE FUNCTION public.valider_billet(
  p_code_qr  UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id            UUID;
  v_statut        TEXT;
  v_utilise_le    TIMESTAMPTZ;
  v_tt_id         UUID;
  v_order_id      UUID;
  v_tt_nom        TEXT;
  v_orga_id       UUID;
  v_ev_titre      TEXT;
  v_ev_date       DATE;
  v_user_role     TEXT;
  v_titulaire     TEXT;
BEGIN
  -- Verrouille la ligne pour bloquer un second scan concurrent
  SELECT t.id, t.statut, t.utilise_le, t.ticket_type_id, t.order_id
  INTO   v_id,  v_statut, v_utilise_le,  v_tt_id,         v_order_id
  FROM   public.tickets t
  WHERE  t.code_qr = p_code_qr
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'inconnu');
  END IF;

  -- Infos du type de billet et de l'événement
  SELECT tt.nom, e.organisateur_id, e.titre, e.date_debut
  INTO   v_tt_nom, v_orga_id,        v_ev_titre, v_ev_date
  FROM   public.ticket_types tt
  JOIN   public.events e ON e.id = tt.event_id
  WHERE  tt.id = v_tt_id;

  -- Vérification du rôle : admin = tout, organisateur = seulement ses événements
  SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;

  IF v_user_role IS DISTINCT FROM 'admin'
     AND v_orga_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_autorise');
  END IF;

  -- Vérification du statut du billet
  IF v_statut = 'annule' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'annule');
  END IF;

  IF v_statut = 'utilise' THEN
    RETURN jsonb_build_object(
      'ok',        false,
      'raison',    'deja_utilise',
      'utilise_le', v_utilise_le
    );
  END IF;

  -- Événement passé : refusé même si le billet est encore 'valide' (la
  -- colonne events.statut peut ne pas avoir encore été mise à jour par
  -- cloturer_evenements_passes()/pg_cron — on vérifie la date directement).
  IF v_ev_date < (NOW() AT TIME ZONE 'Africa/Porto-Novo')::date THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'evenement_termine');
  END IF;

  -- Nom du titulaire (depuis la commande)
  SELECT p.nom
  INTO   v_titulaire
  FROM   public.orders  o
  JOIN   public.profiles p ON p.id = o.user_id
  WHERE  o.id = v_order_id;

  -- Mise à jour ATOMIQUE : valide → utilise
  UPDATE public.tickets
  SET    statut = 'utilise', utilise_le = NOW()
  WHERE  id = v_id;

  RETURN jsonb_build_object(
    'ok',           true,
    'nom_titulaire', COALESCE(v_titulaire, 'Inconnu'),
    'type_billet',  v_tt_nom,
    'event_titre',  v_ev_titre
  );
END;
$$;

-- CREATE OR REPLACE ne réinitialise pas les privilèges existants tant que
-- la signature ne change pas, mais on les re-déclare explicitement dans
-- chaque migration qui touche une fonction SECURITY DEFINER : chaque
-- fichier reste correct et auditable isolément, sans dépendre de l'état
-- laissé par une migration précédente.
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) TO   service_role;
