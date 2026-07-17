-- Corrige E3 (audit sécurité) : lib/commandes.ts::finaliserCommande
-- décrémentait le stock (quantite_vendue) via un SELECT puis un UPDATE
-- séparés, calculés côté application — pas atomique. Deux commandes
-- distinctes finalisées en concurrence sur le même ticket_type_id (deux
-- webhooks FedaPay proches dans le temps) pouvaient toutes deux lire la
-- même valeur de départ et se marcher dessus (lost update), survendant
-- des billets au-delà du stock réel. Aucune contrainte en base ne
-- l'empêchait.
--
-- ATTENTION avant d'appliquer cette migration : la contrainte CHECK
-- ci-dessous échouera si une ligne existante viole déjà
-- quantite_vendue <= quantite_totale. Faire tourner ce contrôle avant :
--
--   SELECT id, event_id, nom, quantite_totale, quantite_vendue
--   FROM ticket_types
--   WHERE quantite_vendue > quantite_totale;
--
-- Si cette requête retourne des lignes, ne pas appliquer la migration
-- telle quelle — traiter ces lignes au cas par cas d'abord.

-- ========================================
-- 1. Filet de sécurité : la base refuse toute survente, quelle que soit
--    la voie d'écriture (fonction ci-dessous, appel direct service_role,
--    script futur...).
-- ========================================

ALTER TABLE public.ticket_types DROP CONSTRAINT IF EXISTS quantite_vendue_dans_limite;
ALTER TABLE public.ticket_types
  ADD CONSTRAINT quantite_vendue_dans_limite CHECK (quantite_vendue <= quantite_totale);

-- ========================================
-- 2. Réservation atomique du stock. Le UPDATE conditionnel est
--    intrinsèquement atomique en Postgres : deux appels concurrents sur
--    la même ligne se sérialisent via le verrou de ligne pris par
--    l'UPDATE lui-même (pas besoin de SELECT ... FOR UPDATE séparé) —
--    le second appel relit la valeur déjà incrémentée par le premier
--    avant d'évaluer sa propre condition, donc ne peut plus dépasser
--    quantite_totale.
-- ========================================

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
  UPDATE public.ticket_types
  SET    quantite_vendue = quantite_vendue + p_quantite
  WHERE  id = p_ticket_type_id
    AND  quantite_vendue + p_quantite <= quantite_totale;

  RETURN FOUND;
END;
$$;

-- Seul service_role (serveur) peut appeler cette fonction. p_ticket_type_id
-- et p_quantite ne sont liés à aucune commande/utilisateur : les exposer à
-- un rôle client permettrait de manipuler le stock directement, hors de
-- tout flux de paiement.
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.reserver_stock_billet(UUID, INTEGER) TO   service_role;
