-- Achat invité (guest checkout) : permet de créer une commande sans compte
-- Supabase Auth. Un organisateur a remonté que des acheteurs abandonnaient
-- leur achat en voyant l'obligation de créer un compte avant de payer.
--
-- Deux façons pour une commande d'exister désormais :
--   - compte      : user_id renseigné, acheteur_* NULL (comportement actuel,
--                   inchangé — nom/email retrouvés via profiles/auth.users) ;
--   - invité      : user_id NULL, acheteur_nom/email/telephone renseignés
--                   directement sur la commande (aucun compte créé, pas de
--                   mot de passe).
-- Jamais les deux à la fois : le CHECK ci-dessous impose l'exclusivité, pour
-- que tout le code applicatif puisse trancher sur un seul test
-- (`if (order.user_id) { ... } else { ... }`) sans état ambigu.
--
-- Cette commande ne concerne QUE `orders`. Aucune policy RLS ne change :
-- - les policies SELECT existantes sur `orders`/`tickets` restent scopées à
--   `user_id = auth.uid()` — une commande invité (user_id NULL) n'est
--   simplement lisible par personne via ces policies, ce qui est correct
--   (elle n'appartient à aucun compte) ;
-- - tous les writes sur `orders` sont déjà bloqués côté anon/authenticated
--   (`WITH CHECK (false)` / `USING (false)`, voir 20260706120000_init_schema.sql)
--   et passent exclusivement par service_role (lib/supabase-admin.ts) — le
--   code applicatif (app/api/orders, app/api/billets/retrouver, lib/billets.ts)
--   devra lire acheteur_* pour les commandes invité, mais ça ne touche à
--   aucune policy.

-- ========================================
-- 1. user_id devient optionnel
-- ========================================

ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- ========================================
-- 2. Identité de l'acheteur invité, portée directement par la commande
--    (jamais par un compte auth.users)
-- ========================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS acheteur_nom TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS acheteur_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS acheteur_telephone TEXT;

-- Exclusivité stricte compte / invité. Sûr à ajouter directement (sans
-- NOT VALID) : toutes les lignes existantes ont déjà user_id NOT NULL
-- (contrainte en place jusqu'à l'étape 1 ci-dessus) et acheteur_* NULL
-- (colonnes qui viennent d'être créées) — elles satisfont automatiquement
-- la première branche.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_identite_acheteur;
ALTER TABLE public.orders ADD CONSTRAINT orders_identite_acheteur CHECK (
  (user_id IS NOT NULL AND acheteur_nom IS NULL AND acheteur_email IS NULL AND acheteur_telephone IS NULL)
  OR
  (user_id IS NULL AND acheteur_nom IS NOT NULL AND acheteur_email IS NOT NULL AND acheteur_telephone IS NOT NULL)
);

-- ========================================
-- 3. Dédoublonnage des commandes en_attente : adapté pour couvrir les
--    invités.
-- ========================================
-- L'index unique partiel posé par
-- supabase/migrations/20260720120000_dedoublonnage_commandes_en_attente.sql
-- est clé sur (user_id, event_id, panier_signature). En Postgres, deux NULL
-- ne sont JAMAIS considérés égaux dans un index unique : si user_id devient
-- nullable sans toucher cet index, deux commandes invité concurrentes avec
-- le même panier ne seraient plus dédupliquées du tout — on rouvrirait la
-- faille de double-facturation (audit E4) que cette migration corrigeait.
--
-- On remplace donc la clé "identité" par COALESCE(user_id, email) : un
-- compte se déduplique comme avant (par user_id), un invité se déduplique
-- par son email (déjà obligatoire dans le formulaire invité, donc disponible
-- dès l'INSERT — pas besoin d'un jeton client supplémentaire). lower() pour
-- une comparaison insensible à la casse.
--
-- IMPORTANT : ce calcul DOIT rester cohérent avec toute logique de
-- déduplication côté application (app/api/orders/route.ts) — même principe
-- que la signature de panier (voir lib/commandes.ts::signaturePanier).

DROP INDEX IF EXISTS public.orders_pending_dedupe_idx;

CREATE UNIQUE INDEX IF NOT EXISTS orders_pending_dedupe_idx
  ON public.orders (COALESCE(user_id::text, lower(acheteur_email)), event_id, panier_signature)
  WHERE statut = 'en_attente';

-- ========================================
-- 4. Recherche par email invité (support, "Retrouver mon billet")
-- ========================================
-- Symétrique à la recherche par compte (qui passe par auth.users, non
-- indexable ici) : lib/billets.ts::rechercherBillets et
-- app/api/billets/retrouver devront filtrer sur acheteur_email pour les
-- commandes invité — cet index évite un scan complet de `orders`.

CREATE INDEX IF NOT EXISTS idx_orders_acheteur_email
  ON public.orders (lower(acheteur_email))
  WHERE acheteur_email IS NOT NULL;
