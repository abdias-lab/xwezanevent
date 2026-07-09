-- Fonction d'accès contrôlée par scan QR — atomique (FOR UPDATE)
-- Deux scans simultanés du même billet : un seul passage en 'utilise'.
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
  SELECT tt.nom, e.organisateur_id, e.titre
  INTO   v_tt_nom, v_orga_id,        v_ev_titre
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

-- Seul service_role (serveur) peut appeler cette fonction.
-- p_user_id étant un paramètre libre, l'exposer aux rôles client serait
-- une faille : un appelant pourrait usurper n'importe quel user_id.
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) TO   service_role;
