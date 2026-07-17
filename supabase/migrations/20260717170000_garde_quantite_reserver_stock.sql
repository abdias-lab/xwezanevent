-- Suite de E3 (audit sécurité). reserver_stock_billet ne validait pas
-- p_quantite : une quantité négative ou nulle passerait la condition
-- `quantite_vendue + p_quantite <= quantite_totale` (une valeur négative
-- la rend même plus facile à satisfaire) et déciderait le stock au lieu
-- de le réserver. Aucun appelant actuel n'envoie une telle valeur
-- (lib/commandes.ts construit p_quantite depuis le panier), mais une
-- fonction qui touche à l'argent/au stock doit refuser une entrée absurde
-- par principe, pas seulement compter sur la discipline des appelants.

CREATE OR REPLACE FUNCTION public.reserver_stock_billet(
  p_ticket_type_id UUID,
  p_quantite INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantite <= 0 THEN
    RAISE EXCEPTION 'quantite invalide';
  END IF;

  UPDATE public.ticket_types
  SET    quantite_vendue = quantite_vendue + p_quantite
  WHERE  id = p_ticket_type_id
    AND  quantite_vendue + p_quantite <= quantite_totale;

  RETURN FOUND;
END;
$$;

-- Inchangé, re-déclaré par principe (règle du projet sur les fonctions
-- SECURITY DEFINER recréées).
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) TO   service_role;
