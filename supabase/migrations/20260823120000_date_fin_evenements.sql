-- Support des événements/festivals multi-jours (ex. 22-24 août). Ajoute la
-- date de fin, absente jusqu'ici (events n'avait que date_debut).
--
-- NULLABLE, pas NOT NULL DEFAULT date_debut : un événement d'un seul jour
-- garde date_fin = NULL plutôt que dupliquer date_debut. Ça évite de
-- comparer deux dates partout où le code applicatif et les fonctions SQL
-- ne connaissaient jusqu'ici que date_debut — un seul
-- COALESCE(date_fin, date_debut) suffit désormais partout où la "vraie"
-- date de fin est nécessaire (voir cloturer_evenements_passes() et
-- valider_billet() plus bas ; les autres correctifs — lib/payouts.ts,
-- lib/events.ts, /api/orders — sont des changements applicatifs séparés,
-- pas dans cette migration).
--
-- valider_billet() est un CREATE OR REPLACE complet : au-delà du contrôle
-- "événement terminé" basé sur date_fin, elle reporte aussi le correctif du
-- nom du titulaire (LEFT JOIN + COALESCE sur orders.acheteur_nom pour les
-- acheteurs invités, voir 20260811120000_lien_scan_evenement.sql) — sans
-- quoi ce remplacement complet de la fonction referait régresser cet
-- acheteur invité vers le JOIN direct sur profiles.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS date_fin DATE;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS date_fin_apres_date_debut;
ALTER TABLE public.events
  ADD CONSTRAINT date_fin_apres_date_debut
  CHECK (date_fin IS NULL OR date_fin >= date_debut);

-- ========================================
-- cloturer_evenements_passes() : clôture désormais à la fin RÉELLE de
-- l'événement (date_fin si renseignée, sinon date_debut comme avant).
-- Sans ce correctif, un festival du 22 au 24 passerait en statut 'termine'
-- dès le 23 — un jour avant sa vraie fin.
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
    AND  COALESCE(date_fin, date_debut) < (now() AT TIME ZONE 'Africa/Porto-Novo')::date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Inchangé, re-déclaré par principe (règle du projet sur les fonctions
-- SECURITY DEFINER recréées).
REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cloturer_evenements_passes() FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.cloturer_evenements_passes() TO   service_role;

-- ========================================
-- valider_billet() : le refus "événement terminé" doit lui aussi se baser
-- sur la fin réelle, sinon le premier scan du jour 2/3 d'un festival est
-- rejeté à tort. Reste de la fonction strictement inchangé (statut
-- valide/utilise binaire — le contrôle d'accès multi-jours se fait par
-- bracelet physique, pas par re-scan, décision produit confirmée).
-- ========================================

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

  -- Événement passé : refusé même si le billet est encore 'valide' (la
  -- colonne events.statut peut ne pas avoir encore été mise à jour par
  -- cloturer_evenements_passes()/pg_cron — on vérifie la date directement).
  -- COALESCE(date_fin, date_debut) : sur un festival multi-jours, refuse
  -- seulement après la VRAIE fin, pas après le premier jour.
  IF COALESCE(v_ev_date_fin, v_ev_date) < (NOW() AT TIME ZONE 'Africa/Porto-Novo')::date THEN
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
