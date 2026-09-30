-- « Marquer remboursé » pour un achat payé en double (BUGS_REFONTE n°25).
--
-- Contexte : après « Recommencer l'achat », si la première tentative (restée
-- « pending » chez FedaPay) est finalement validée, l'acheteur a deux
-- commandes payées pour une même origine (orders.recommencee_depuis,
-- 20260930130000). Le tableau de bord admin les signale ; l'admin
-- rembourse la commande en trop sur Mobile Money, puis la marque ici.
--
-- Une seule opération atomique, parce que le reversement à l'organisateur
-- se calcule sur ticket_types.quantite_vendue (lib/payouts.ts,
-- lib/orga-chiffres.ts) : sans décrémenter ce compteur, l'organisateur
-- serait payé pour des billets remboursés à l'acheteur.
--   1. la commande passe « paye » → « rembourse » ;
--   2. ses billets « valide » passent « annule » (refusés au scan,
--      valider_billet / valider_billet_lien) ;
--   3. quantite_vendue est diminuée d'autant (les places reviennent en vente).
--
-- Garde-fous (refus sans rien modifier) :
--   - 'introuvable' / 'pas_payee' : commande absente ou pas « paye » ;
--   - 'pas_en_double' : aucune AUTRE commande payée dans le même groupe —
--     la fonction ne sert qu'aux doubles, jamais à rembourser une commande
--     ordinaire (ce sera le n°7) ;
--   - 'billets_utilises' : au moins un billet de cette commande a déjà été
--     scanné à l'entrée — c'est l'autre commande qu'il faut rembourser.
-- Les commandes du groupe sont verrouillées (FOR UPDATE) : deux clics
-- simultanés sur les deux commandes d'une même paire ne peuvent pas
-- rembourser les deux.
--
-- Appelée uniquement par la route admin /api/admin/orders/[id]/rembourser-double
-- (client service_role, rôle admin vérifié par l'application).

BEGIN;

CREATE OR REPLACE FUNCTION public.rembourser_achat_double(p_order_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statut   TEXT;
  v_origine  UUID;
  v_autres   INTEGER;
  v_utilises INTEGER;
BEGIN
  SELECT statut, COALESCE(recommencee_depuis, id)
    INTO v_statut, v_origine
    FROM public.orders
   WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN 'introuvable';
  END IF;

  -- Verrou sur tout le groupe, dans un ordre stable (pas d'interblocage).
  PERFORM 1
     FROM public.orders
    WHERE id = v_origine OR recommencee_depuis = v_origine
    ORDER BY id
      FOR UPDATE;

  -- Relecture sous verrou.
  SELECT statut INTO v_statut FROM public.orders WHERE id = p_order_id;
  IF v_statut <> 'paye' THEN
    RETURN 'pas_payee';
  END IF;

  SELECT count(*) INTO v_autres
    FROM public.orders
   WHERE statut = 'paye'
     AND id <> p_order_id
     AND (id = v_origine OR recommencee_depuis = v_origine);
  IF v_autres = 0 THEN
    RETURN 'pas_en_double';
  END IF;

  SELECT count(*) INTO v_utilises
    FROM public.tickets
   WHERE order_id = p_order_id AND statut = 'utilise';
  IF v_utilises > 0 THEN
    RETURN 'billets_utilises';
  END IF;

  UPDATE public.ticket_types tt
     SET quantite_vendue = GREATEST(0, tt.quantite_vendue - c.n)
    FROM (
      SELECT ticket_type_id, count(*)::INTEGER AS n
        FROM public.tickets
       WHERE order_id = p_order_id AND statut = 'valide'
       GROUP BY ticket_type_id
    ) c
   WHERE tt.id = c.ticket_type_id;

  UPDATE public.tickets
     SET statut = 'annule'
   WHERE order_id = p_order_id AND statut = 'valide';

  UPDATE public.orders
     SET statut = 'rembourse'
   WHERE id = p_order_id;

  RETURN 'ok';
END;
$$;

-- Seul service_role peut l'appeler : elle modifie commandes, billets et stock.
REVOKE EXECUTE ON FUNCTION public.rembourser_achat_double(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rembourser_achat_double(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rembourser_achat_double(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.rembourser_achat_double(UUID) TO   service_role;

COMMIT;

-- Vérification (à lancer après application) : la fonction existe, seul
-- service_role peut l'exécuter.
SELECT r AS role, has_function_privilege(r, 'public.rembourser_achat_double(uuid)', 'EXECUTE') AS execution
FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r;
