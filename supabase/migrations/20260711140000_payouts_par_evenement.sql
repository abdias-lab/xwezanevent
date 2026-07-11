-- Rattache chaque demande de virement à un événement précis, pour pouvoir
-- geler UNIQUEMENT les virements liés à un événement annulé (plutôt que
-- toutes les demandes en attente de l'organisateur, comme le faisait la
-- première version de annuler_evenement()).
-- Date: 2026-07-11
--
-- Sûr à appliquer : la table payouts est vide en production à ce jour (pas
-- encore de flux de demande de virement), donc la colonne peut être ajoutée
-- directement en NOT NULL sans backfill.

ALTER TABLE public.payouts
  ADD COLUMN event_id UUID REFERENCES public.events(id);

ALTER TABLE public.payouts
  ALTER COLUMN event_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_event_id ON public.payouts(event_id);

-- Remplace annuler_evenement() : ne gèle plus que les virements en attente
-- rattachés à CET événement (et non plus toutes les demandes de
-- l'organisateur, devenu inutilement large maintenant que payouts a un
-- event_id).
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
  WHERE  event_id = p_event_id
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
