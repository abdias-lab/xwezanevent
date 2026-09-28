-- Date de soumission à la validation d'un événement (events.soumis_le).
--
-- Contexte (refonte V2, tableau de bord admin) : l'équipe trie les
-- événements à valider par ancienneté (« soumis il y a N jours », « le plus
-- ancien attend depuis… »). created_at ne convient pas durablement : c'est
-- la date de création de la ligne, qui s'éloignera de la soumission dès
-- qu'un événement pourra être enregistré en brouillon ou resoumis après un
-- refus.
--
-- Règle portée par le trigger ci-dessous :
--   - entrée en 'en_validation' (INSERT dans ce statut, ou UPDATE qui y fait
--     passer depuis un autre statut) : soumis_le = now(). Une resoumission
--     après refus remet donc le compteur à zéro, volontairement : c'est
--     l'attente de l'équipe sur la version courante qui compte ;
--   - toute autre écriture : soumis_le garde sa valeur (NULL à l'INSERT
--     hors validation). Toute écriture directe de la colonne est ignorée.

BEGIN;

-- ========================================
-- 1. Colonne + remplissage des lignes existantes
-- ========================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS soumis_le TIMESTAMP WITH TIME ZONE;

-- Jusqu'ici, le seul chemin d'entrée en validation est la création
-- (app/(orga)/creer/actions.ts insère directement en 'en_validation' ; aucun
-- chemin ne remet un événement en validation). Pour toutes les lignes
-- existantes, created_at est donc exactement la date de soumission — y
-- compris les 3 brouillons, anciens événements de test créés en validation
-- puis dépubliés à la main (contrôle du 2026-09-28 : 11 événements, dont
-- 0 en validation).
-- Remplissage sans toucher à updated_at (le trigger update_events_updated_at
-- réécrirait la date de dernière modification de chaque événement).
ALTER TABLE public.events DISABLE TRIGGER update_events_updated_at;
UPDATE public.events
SET soumis_le = created_at
WHERE soumis_le IS NULL;
ALTER TABLE public.events ENABLE TRIGGER update_events_updated_at;

-- ========================================
-- 2. Trigger
-- ========================================
-- SECURITY INVOKER (défaut) : la fonction ne lit aucune autre table, elle
-- ne manipule que NEW/OLD. search_path figé par principe.
CREATE OR REPLACE FUNCTION public.maj_soumis_le()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.statut = 'en_validation'
     AND (TG_OP = 'INSERT' OR OLD.statut IS DISTINCT FROM 'en_validation') THEN
    NEW.soumis_le := now();
  ELSIF TG_OP = 'INSERT' THEN
    NEW.soumis_le := NULL;
  ELSE
    NEW.soumis_le := OLD.soumis_le;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_soumis_le ON public.events;
CREATE TRIGGER events_soumis_le
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.maj_soumis_le();

-- Fonction de trigger : jamais appelée directement, aucun GRANT nécessaire
-- (le déclenchement ne vérifie pas EXECUTE) ; on retire le droit par défaut.
REVOKE EXECUTE ON FUNCTION public.maj_soumis_le() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maj_soumis_le() FROM anon;
REVOKE EXECUTE ON FUNCTION public.maj_soumis_le() FROM authenticated;

-- ========================================
-- 3. Lecture
-- ========================================
-- Aucun GRANT de colonne : la page admin lit `events` avec le client de
-- session, sous les policies existantes, comme les autres colonnes. Pas de
-- REVOKE UPDATE de colonne non plus (sans effet, voir
-- 20260927120000_date_reference_virement.sql, section 3) : la policy
-- "Block update events via anon" et le trigger ci-dessus suffisent.

COMMIT;

-- ========================================
-- Vérification après application (lecture seule)
-- ========================================
-- Attendu : 0 ligne.
SELECT id, slug, statut, created_at, soumis_le
FROM public.events
WHERE soumis_le IS DISTINCT FROM created_at;
