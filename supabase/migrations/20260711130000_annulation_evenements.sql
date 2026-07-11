-- Annulation d'événement (admin ou organisateur) + journalisation des actions.
-- Date: 2026-07-11

-- ========================================
-- 1. Nouveaux statuts
-- ========================================

-- events.statut : ajoute 'annule' (dépublication + arrêt des ventes).
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_statut_check;
ALTER TABLE public.events ADD CONSTRAINT events_statut_check
  CHECK (statut IN ('brouillon', 'en_validation', 'publie', 'termine', 'refuse', 'annule'));

-- payouts.statut : ajoute 'bloque' (virement gelé suite à l'annulation d'un
-- événement de l'organisateur — la demande de virement n'est pas liée à un
-- événement précis dans le schéma actuel, donc on gèle TOUTES les demandes
-- en attente de l'organisateur concerné).
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_statut_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_statut_check
  CHECK (statut IN ('demande', 'traite', 'bloque'));

-- ========================================
-- 2. Journal d'audit des actions sensibles (admin + organisateur)
-- ========================================

CREATE TABLE IF NOT EXISTS public.journal_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id UUID NOT NULL REFERENCES public.profiles(id),
  acteur_role TEXT NOT NULL,
  action TEXT NOT NULL,
  detail JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_actions_created_at ON public.journal_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_actions_acteur_id ON public.journal_actions(acteur_id);

ALTER TABLE public.journal_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can read journal" ON public.journal_actions;
CREATE POLICY "Admin can read journal"
  ON public.journal_actions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Écritures réservées au serveur (service_role bypasse RLS de toute façon) ;
-- cette policy bloque explicitement toute tentative via anon/authenticated.
DROP POLICY IF EXISTS "Block insert journal via anon" ON public.journal_actions;
CREATE POLICY "Block insert journal via anon"
  ON public.journal_actions FOR INSERT
  WITH CHECK (false);

-- ========================================
-- 3. Fonction d'annulation atomique
-- ========================================
-- Appelée par les routes /api/admin/events/[id]/annuler et
-- /api/orga/events/[id]/annuler (toutes deux via supabaseAdmin/service_role
-- après vérification du rôle côté application — le trigger
-- prevent_unauthorized_status_change n'autorise de toute façon la
-- transition de statut que pour service_role/postgres).
--
-- Effets, en une seule transaction :
--   - events.statut -> 'annule' (retire l'événement du catalogue public et
--     de la page événement, qui ne servent que statut IN ('publie','termine'))
--   - tickets valides de cet événement -> 'annule' (valider_billet refuse
--     déjà les billets 'annule' au scan) ; les billets déjà 'utilise'
--     restent inchangés (on ne réécrit pas l'historique d'un scan déjà fait)
--   - payouts 'demande' de l'organisateur -> 'bloque'
--   - une ligne dans journal_actions
CREATE OR REPLACE FUNCTION public.annuler_evenement(
  p_event_id    UUID,
  p_acteur_id   UUID,
  p_acteur_role TEXT,
  p_motif       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut          TEXT;
  v_organisateur    UUID;
  v_titre           TEXT;
  v_tickets_annules INTEGER;
  v_payouts_geles   INTEGER;
BEGIN
  SELECT statut, organisateur_id, titre
  INTO   v_statut,  v_organisateur,  v_titre
  FROM   public.events
  WHERE  id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'introuvable');
  END IF;

  IF v_statut = 'annule' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'deja_annule');
  END IF;

  UPDATE public.events SET statut = 'annule' WHERE id = p_event_id;

  UPDATE public.tickets t
  SET    statut = 'annule'
  FROM   public.ticket_types tt
  WHERE  t.ticket_type_id = tt.id
    AND  tt.event_id = p_event_id
    AND  t.statut = 'valide';
  GET DIAGNOSTICS v_tickets_annules = ROW_COUNT;

  UPDATE public.payouts
  SET    statut = 'bloque'
  WHERE  organisateur_id = v_organisateur
    AND  statut = 'demande';
  GET DIAGNOSTICS v_payouts_geles = ROW_COUNT;

  INSERT INTO public.journal_actions (acteur_id, acteur_role, action, detail)
  VALUES (
    p_acteur_id,
    p_acteur_role,
    'annulation_evenement',
    jsonb_build_object(
      'event_id', p_event_id,
      'titre', v_titre,
      'organisateur_id', v_organisateur,
      'motif', p_motif,
      'tickets_annules', v_tickets_annules,
      'payouts_geles', v_payouts_geles
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'titre', v_titre,
    'tickets_annules', v_tickets_annules,
    'payouts_geles', v_payouts_geles
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.annuler_evenement(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.annuler_evenement(UUID, UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.annuler_evenement(UUID, UUID, TEXT, TEXT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.annuler_evenement(UUID, UUID, TEXT, TEXT) TO   service_role;
