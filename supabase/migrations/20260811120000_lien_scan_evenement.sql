-- Lien de scan délégué, sans compte : un organisateur génère un jeton
-- (UUID aléatoire) attaché à SON événement, le partage (WhatsApp, SMS) à
-- qui il veut pour le jour J — quiconque a ce lien peut scanner/rechercher
-- des billets pour CET événement précis, rien d'autre. Révocable/régénérable
-- à tout moment (écrase ou vide le jeton).
--
-- Colonne unique sur `events`, pas de table séparée : un seul lien partagé
-- par toute l'équipe de contrôle d'accès suffit au besoin réel (confirmé
-- avec Abdias) — pas d'historique de plusieurs liens simultanés à gérer.
--
-- `lien_scan_token` est un UUID délibérément DISTINCT de `events.id` :
-- jamais réutiliser un identifiant déjà exposé ailleurs (URLs publiques,
-- exports...) comme jeton porteur d'accès. UNIQUE pour un lookup direct et
-- pour éliminer par construction toute collision entre deux événements.
--
-- REVOKE UPDATE en défense en profondeur, même schéma que taux_commission
-- (20260726130000) : la policy "Organisateurs can update their own events"
-- n'a aucune restriction de colonne par défaut. Aucun chemin de l'app
-- n'écrit sur `events` autrement que via supabaseAdmin (service_role) dans
-- des routes serveur avec contrôle d'accès explicite (verifierProprietaireEvenement)
-- — seul service_role doit donc pouvoir écrire ce champ.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS lien_scan_token UUID UNIQUE;

REVOKE UPDATE (lien_scan_token) ON public.events FROM authenticated;
REVOKE UPDATE (lien_scan_token) ON public.events FROM anon;

-- ========================================
-- Validation d'un billet via un lien de scan délégué
-- ========================================
-- Miroir de valider_billet (20260709130000_valider_billet_fn.sql) — même
-- verrou atomique FOR UPDATE (deux scans simultanés du même billet, y
-- compris depuis deux téléphones différents partageant le même lien : un
-- seul passage en 'utilise', le second reçoit 'deja_utilise' — comportement
-- déjà couvert par ce verrou, rien à ajuster de ce côté), mêmes refus
-- (annulé/déjà utilisé), même structure de retour.
--
-- Différence volontaire avec valider_billet : l'autorisation ne repose PAS
-- sur profiles.role/organisateur_id (l'appelant n'a aucun compte) mais
-- uniquement sur la correspondance ticket → événement précis, déjà vérifiée
-- en amont côté application (résolution du token → event_id avant cet
-- appel). RPC séparée plutôt que modifier valider_billet : le chemin
-- organisateur authentifié, déjà éprouvé, reste totalement intact.
--
-- Corrige au passage l'angle mort d'origine de valider_billet (nom du
-- titulaire) : voir plus bas.
CREATE OR REPLACE FUNCTION public.valider_billet_lien(
  p_code_qr   UUID,
  p_event_id  UUID
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
  v_ev_id         UUID;
  v_ev_titre      TEXT;
  v_titulaire     TEXT;
BEGIN
  -- Verrouille la ligne pour bloquer un second scan concurrent (même lien,
  -- deux appareils différents, ou l'organisateur et le lien en même temps).
  SELECT t.id, t.statut, t.utilise_le, t.ticket_type_id, t.order_id
  INTO   v_id,  v_statut, v_utilise_le,  v_tt_id,         v_order_id
  FROM   public.tickets t
  WHERE  t.code_qr = p_code_qr
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'inconnu');
  END IF;

  -- Infos du type de billet et de l'événement
  SELECT tt.nom, e.id, e.titre
  INTO   v_tt_nom, v_ev_id, v_ev_titre
  FROM   public.ticket_types tt
  JOIN   public.events e ON e.id = tt.event_id
  WHERE  tt.id = v_tt_id;

  -- Seul verrou d'autorisation : ce billet appartient-il à L'ÉVÉNEMENT du
  -- lien utilisé ? Aucune notion de rôle/compte ici, contrairement à
  -- valider_billet — c'est tout l'intérêt de cette fonction séparée.
  IF v_ev_id IS DISTINCT FROM p_event_id THEN
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

  -- Nom du titulaire : compte (profiles.nom) OU invité (orders.acheteur_nom,
  -- voir 20260804120000_achat_invite.sql) — LEFT JOIN + COALESCE plutôt que
  -- le JOIN direct sur profiles utilisé jusqu'ici, qui renvoyait NULL (donc
  -- "Inconnu" plus bas) pour toute commande invité. Corrigé ici ET dans
  -- valider_billet (voir plus bas) : l'achat invité n'est plus un cas rare,
  -- laisser "Inconnu" à l'entrée pour ces acheteurs serait un vrai défaut
  -- d'usage pour la personne qui scanne.
  SELECT COALESCE(p.nom, o.acheteur_nom)
  INTO   v_titulaire
  FROM   public.orders  o
  LEFT JOIN public.profiles p ON p.id = o.user_id
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

-- Seul service_role (serveur) peut appeler cette fonction — p_event_id
-- étant un paramètre libre, l'exposer aux rôles client serait une faille :
-- un appelant pourrait passer n'importe quel event_id sans posséder le
-- jeton correspondant. La résolution token → event_id doit TOUJOURS avoir
-- lieu côté serveur (supabaseAdmin) avant cet appel, jamais confiance dans
-- un event_id fourni par le client.
REVOKE EXECUTE ON FUNCTION public.valider_billet_lien(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valider_billet_lien(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valider_billet_lien(UUID, UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.valider_billet_lien(UUID, UUID) TO   service_role;

-- ========================================
-- Même correctif sur valider_billet (chemin organisateur authentifié)
-- ========================================
-- Identique à 20260709130000_valider_billet_fn.sql, seule la sélection du
-- nom du titulaire change (LEFT JOIN + COALESCE sur orders.acheteur_nom —
-- voir le commentaire détaillé plus haut). Le reste de la fonction est
-- inchangé, recopié pour que ce fichier reste un CREATE OR REPLACE complet
-- et non un correctif partiel difficile à auditer isolément.
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
  SELECT t.id, t.statut, t.utilise_le, t.ticket_type_id, t.order_id
  INTO   v_id,  v_statut, v_utilise_le,  v_tt_id,         v_order_id
  FROM   public.tickets t
  WHERE  t.code_qr = p_code_qr
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'inconnu');
  END IF;

  SELECT tt.nom, e.organisateur_id, e.titre
  INTO   v_tt_nom, v_orga_id,        v_ev_titre
  FROM   public.ticket_types tt
  JOIN   public.events e ON e.id = tt.event_id
  WHERE  tt.id = v_tt_id;

  SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id;

  IF v_user_role IS DISTINCT FROM 'admin'
     AND v_orga_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'non_autorise');
  END IF;

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

  -- Nom du titulaire : compte OU invité (voir valider_billet_lien plus haut).
  SELECT COALESCE(p.nom, o.acheteur_nom)
  INTO   v_titulaire
  FROM   public.orders  o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  WHERE  o.id = v_order_id;

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

REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) TO   service_role;
