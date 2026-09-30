-- Commandes recommencées après un paiement non abouti (BUGS_REFONTE n°25).
--
-- Contexte : quand l'acheteur annule sur la page de paiement FedaPay, la
-- transaction reste « pending » 24 h (vérifié en sandbox : aucune n'est
-- jamais passée à « canceled », et l'API ne permet pas de l'annuler). La
-- relance sur la même commande est refusée pendant ce temps (risque de
-- double débit, n°12) : l'acheteur était bloqué 24 h.
--
-- « Recommencer l'achat » crée désormais une NOUVELLE commande et ne touche
-- pas à l'ancienne, qui garde sa transaction : si celle-ci est finalement
-- validée (Mobile Money confirmé sur le téléphone après coup), le webhook
-- la finalise normalement. Au pire, l'acheteur a payé deux fois et reçu
-- deux jeux de billets : remboursable, jamais un paiement sans billet.
--
-- recommencee_depuis : la commande d'ORIGINE de la chaîne (toujours la
-- première, même après plusieurs « Recommencer »). Le tableau de bord admin
-- regroupe par origine : deux commandes payées dans un même groupe = achat
-- payé en double, à rembourser.
--
-- L'ancienne commande reste « en_attente », mais sa panier_signature passe à
-- NULL (lib/commandes.ts) : elle sort ainsi de l'index de déduplication
-- orders_pending_dedupe_idx (20260720120000), qui bloquerait sinon la
-- nouvelle commande au panier identique. NULL est distinct de tout, y
-- compris d'un autre NULL, dans un index unique.
--
-- Droits : aucun GRANT. Écriture exclusivement par le client service_role
-- (routes /api/orders et /api/orders/[id]/recommencer) ; lecture par
-- l'admin via service_role.

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recommencee_depuis UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_recommencee_depuis_idx
  ON public.orders (recommencee_depuis)
  WHERE recommencee_depuis IS NOT NULL;

COMMENT ON COLUMN public.orders.recommencee_depuis IS
  'Commande d''origine quand l''acheteur a recommencé l''achat après un paiement non abouti (BUGS_REFONTE n°25). Deux commandes payées pour une même origine = paiement en double à rembourser.';

COMMIT;

-- Vérification (à lancer après application).
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'recommencee_depuis';

SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'orders' AND indexname = 'orders_recommencee_depuis_idx';
