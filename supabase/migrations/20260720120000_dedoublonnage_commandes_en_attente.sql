-- Corrige E4 (audit idempotence paiement, 2026-07-20) : POST /api/orders
-- créait une commande + une transaction FedaPay sans aucune déduplication
-- côté serveur. Le double-clic était bloqué côté client (bouton désactivé)
-- mais rien n'empêchait deux requêtes concurrentes (deux onglets, requête
-- rejouée, race avant re-rendu React) de créer deux commandes distinctes
-- pour la même intention d'achat — l'acheteur pouvait être facturé deux
-- fois.
--
-- Solution : une contrainte unique partielle en base, pas une vérification
-- applicative (SELECT-puis-INSERT serait elle-même sujette à la même race).
-- Postgres garantit qu'un seul INSERT concurrent peut réussir sur la même
-- clé, quel que soit le timing — voir app/api/orders/route.ts pour la
-- gestion de l'erreur 23505 qui en résulte (réutilisation de la commande
-- existante si récente, sinon clôture et nouvelle tentative).

-- ========================================
-- 1. Signature canonique du panier
-- ========================================
-- IMPORTANT : ce calcul DOIT rester identique à signaturePanier() dans
-- lib/commandes.ts (tri par ticket_type_id, format "id:quantite" joint par
-- "|"). Toute modification de l'un doit être répercutée dans l'autre —
-- une divergence romprait silencieusement la déduplication (deux paniers
-- identiques produiraient des signatures différentes et ne seraient plus
-- reconnus comme la même intention d'achat).

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS panier_signature TEXT;

-- Backfill des commandes en_attente existantes, pour qu'elles bénéficient
-- aussi de la protection dès l'application de cette migration (les
-- commandes déjà payées/échouées ne sont pas concernées par l'index
-- partiel ci-dessous, inutile de les backfiller).
UPDATE public.orders o
SET    panier_signature = sub.sig
FROM (
  SELECT o2.id,
         string_agg(
           (elem->>'ticket_type_id') || ':' || (elem->>'quantite'),
           '|' ORDER BY elem->>'ticket_type_id'
         ) AS sig
  FROM   public.orders o2, jsonb_array_elements(o2.panier) AS elem
  WHERE  o2.statut = 'en_attente'
  GROUP BY o2.id
) sub
WHERE o.id = sub.id AND o.statut = 'en_attente';

-- ========================================
-- 2. Contrainte unique partielle : une seule commande en_attente à la fois
--    par (utilisateur, événement, panier).
-- ========================================
-- Volontairement PAS de fenêtre temporelle dans l'index (un index ne peut
-- pas référencer now(), qui n'est pas immutable) : la fenêtre des 30 min
-- est gérée côté application, qui clôt (statut = 'echoue') toute commande
-- en_attente plus ancienne avant de retenter l'INSERT. Une fois clôturée,
-- elle sort du périmètre de cet index (WHERE statut = 'en_attente') et ne
-- bloque plus un nouvel achat légitime.

CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_dedupe_idx
  ON public.orders (user_id, event_id, panier_signature)
  WHERE statut = 'en_attente';
