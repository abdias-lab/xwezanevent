-- Date de référence du délai J+3 des reversements, en cliquet.
--
-- Contexte (design/BUGS_REFONTE.md, bug #2) : lib/payouts.ts calcule la
-- disponibilité d'un virement sur COALESCE(date_fin, date_debut), deux
-- colonnes modifiables. Ramener la date d'un événement déjà vendu dans le
-- passé rendait le virement demandable avant sa tenue. Le commit cef6910 a
-- fermé ce chemin dans l'action de modification ; cette migration met la
-- règle en base, pour qu'elle tienne quel que soit le chemin d'écriture
-- (future route, outil admin, script service_role).
--
-- Règle portée par le trigger ci-dessous :
--   - tant qu'aucune commande n'est payée, date_reference_virement suit
--     librement COALESCE(date_fin, date_debut) (correction d'une faute de
--     frappe avant toute vente) ;
--   - dès qu'une commande 'paye' existe, elle ne peut plus que monter :
--     GREATEST(ancienne valeur, nouvelle date). Un report la fait monter,
--     une date avancée la laisse en place ;
--   - toute écriture directe de la colonne est ignorée (la valeur est
--     toujours recalculée par le trigger).
--
-- Le code lira ensuite GREATEST(date_reference_virement, date_fin ?? date_debut)
-- (lib/payouts.ts) : à déployer APRÈS application de cette migration.
--
-- Dérogation exceptionnelle (ex. accord écrit avec un organisateur) : seule
-- voie, dans le SQL Editor, en connaissance de cause :
--   ALTER TABLE public.events DISABLE TRIGGER events_date_reference_virement;
--   UPDATE public.events SET date_reference_virement = '...' WHERE id = '...';
--   ALTER TABLE public.events ENABLE TRIGGER events_date_reference_virement;

BEGIN;

-- ========================================
-- 1. Colonne + remplissage des lignes existantes
-- ========================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS date_reference_virement DATE;

-- Remplissage sans toucher à updated_at (le trigger update_events_updated_at
-- réécrirait la date de dernière modification des 11 événements existants).
-- Contrôle du 2026-09-27 : aucune date suspecte en base (ventes postérieures
-- à la date, virement antérieur au J+3), les dates actuelles sont donc des
-- références saines.
ALTER TABLE public.events DISABLE TRIGGER update_events_updated_at;
UPDATE public.events
SET date_reference_virement = COALESCE(date_fin, date_debut)
WHERE date_reference_virement IS NULL;
ALTER TABLE public.events ENABLE TRIGGER update_events_updated_at;

ALTER TABLE public.events
  ALTER COLUMN date_reference_virement SET NOT NULL;

-- ========================================
-- 2. Trigger en cliquet
-- ========================================
-- SECURITY DEFINER : la lecture de `orders` ne doit pas dépendre des
-- policies RLS du rôle qui écrit sur `events` (un rôle qui ne verrait pas
-- les commandes payées ferait croire à une absence de ventes, donc à une
-- date libre). search_path figé, comme les autres fonctions DEFINER.
CREATE OR REPLACE FUNCTION public.maj_date_reference_virement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nouvelle_date DATE := COALESCE(NEW.date_fin, NEW.date_debut);
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.date_reference_virement := nouvelle_date;
    RETURN NEW;
  END IF;

  -- Dates inchangées : la référence ne bouge pas, même si l'UPDATE tente
  -- d'écrire la colonne directement.
  IF NEW.date_debut IS NOT DISTINCT FROM OLD.date_debut
     AND NEW.date_fin IS NOT DISTINCT FROM OLD.date_fin THEN
    NEW.date_reference_virement := OLD.date_reference_virement;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.event_id = NEW.id AND o.statut = 'paye'
  ) THEN
    NEW.date_reference_virement := GREATEST(OLD.date_reference_virement, nouvelle_date);
  ELSE
    NEW.date_reference_virement := nouvelle_date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_date_reference_virement ON public.events;
CREATE TRIGGER events_date_reference_virement
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.maj_date_reference_virement();

-- Fonction de trigger : jamais appelée directement. Le déclenchement d'un
-- trigger ne vérifie pas EXECUTE, donc aucun GRANT n'est nécessaire, pas
-- même à service_role ; on retire seulement le droit par défaut de PUBLIC.
REVOKE EXECUTE ON FUNCTION public.maj_date_reference_virement() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maj_date_reference_virement() FROM anon;
REVOKE EXECUTE ON FUNCTION public.maj_date_reference_virement() FROM authenticated;

-- ========================================
-- 3. Pas de REVOKE de colonne, volontairement
-- ========================================
-- Un REVOKE UPDATE (colonne) est sans effet tant que le rôle garde le
-- privilège UPDATE sur toute la table (défaut Supabase pour authenticated).
-- La protection réelle est double : la policy RLS "Block update events via
-- anon" (USING false, 20260717180000) interdit tout UPDATE sur `events` hors
-- service_role, et le trigger ci-dessus recalcule la colonne à chaque
-- écriture, quel que soit le rôle.

COMMIT;

-- ========================================
-- Vérification après application (lecture seule)
-- ========================================
-- Attendu : 0 ligne.
SELECT id, slug, date_debut, date_fin, date_reference_virement
FROM public.events
WHERE date_reference_virement IS DISTINCT FROM COALESCE(date_fin, date_debut);
