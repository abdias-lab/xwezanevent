-- Scan à l'entrée : un billet reste valide jusqu'au lendemain du dernier
-- jour de l'événement à 06:00, heure de Porto-Novo (BUGS_REFONTE n°21).
-- Date: 2026-09-29
--
-- Jusqu'ici, valider_billet() refusait tout billet dès minuit le soir du
-- dernier jour (« événement terminé ») : une soirée qui continue après
-- minuit (MIWADÚNÙ, samedi 3 octobre à 18:00) ne pouvait plus faire entrer
-- personne. valider_billet_lien() (scan par lien délégué) n'avait, lui,
-- aucun contrôle de date : il reçoit la même règle, pour que les deux scans
-- donnent la même réponse.
--
-- Décision d'Abdias du 2026-09-29 : seules les deux fonctions de scan
-- changent. La vente en ligne (/api/orders), le catalogue et la clôture
-- automatique de 23:05 (cloturer_evenements_passes) gardent la coupure à
-- minuit pour l'instant.
--
-- CREATE OR REPLACE complets, recopiés de la dernière version de chaque
-- fonction (valider_billet : 20260823120000_date_fin_evenements.sql ;
-- valider_billet_lien : 20260811120000_lien_scan_evenement.sql), seule la
-- règle de date change. REVOKE/GRANT re-déclarés, comme toujours pour une
-- fonction SECURITY DEFINER. Remplace aussi la version de valider_billet
-- trouvée différente par l'audit n°20.

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
  v_ev_date_fin   DATE;
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
  SELECT tt.nom, e.organisateur_id, e.titre, e.date_debut, e.date_fin
  INTO   v_tt_nom, v_orga_id,        v_ev_titre, v_ev_date,  v_ev_date_fin
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

  -- Événement terminé : refusé à partir du LENDEMAIN de son dernier jour à
  -- 06:00 (heure de Porto-Novo), pas dès minuit — une soirée continue après
  -- minuit (BUGS_REFONTE n°21). COALESCE(date_fin, date_debut) : sur un
  -- festival multi-jours, compte depuis la VRAIE fin. Vérifié sur la date,
  -- pas sur events.statut (la clôture automatique de 23:05 peut ne pas
  -- être encore passée).
  IF (NOW() AT TIME ZONE 'Africa/Porto-Novo') >= (COALESCE(v_ev_date_fin, v_ev_date) + 1) + TIME '06:00' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'evenement_termine');
  END IF;

  -- Nom du titulaire : compte (profiles.nom) OU invité (orders.acheteur_nom,
  -- voir 20260804120000_achat_invite.sql) — LEFT JOIN + COALESCE, pas un
  -- JOIN direct sur profiles qui renverrait NULL ("Inconnu") pour toute
  -- commande invité. Correctif porté depuis 20260811120000_lien_scan_evenement.sql,
  -- à préserver ici puisque ce CREATE OR REPLACE remplace toute la fonction.
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

-- Inchangé, re-déclaré par principe.
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.valider_billet(UUID, UUID) TO   service_role;

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
  v_ev_date       DATE;
  v_ev_date_fin   DATE;
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
  SELECT tt.nom, e.id, e.titre, e.date_debut, e.date_fin
  INTO   v_tt_nom, v_ev_id, v_ev_titre, v_ev_date,  v_ev_date_fin
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

  -- Événement terminé (même règle que valider_billet ; ce contrôle manquait
  -- ici, le lien délégué acceptait les billets sans limite de date) :
  -- refusé à partir du LENDEMAIN de son dernier jour à 06:00 (heure de
  -- Porto-Novo), pas dès minuit — une soirée continue après minuit
  -- (BUGS_REFONTE n°21). COALESCE(date_fin, date_debut) : sur un
  -- festival multi-jours, compte depuis la VRAIE fin. Vérifié sur la date,
  -- pas sur events.statut (la clôture automatique de 23:05 peut ne pas
  -- être encore passée).
  IF (NOW() AT TIME ZONE 'Africa/Porto-Novo') >= (COALESCE(v_ev_date_fin, v_ev_date) + 1) + TIME '06:00' THEN
    RETURN jsonb_build_object('ok', false, 'raison', 'evenement_termine');
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
