-- Texte d'accroche d'un événement épinglé (events.accroche).
--
-- Contexte (refonte V2, accueil) : le bloc « En ce moment » est remplacé par
-- un bloc « Épinglé », alimenté uniquement par les événements cochés « à la
-- une » dans l'admin (events.mis_en_avant). Sous l'affiche : un court texte
-- d'accroche, puis la date et l'heure. L'accroche est saisie par l'admin
-- (/admin/evenements), optionnelle ; vide, l'accueil se replie sur le début
-- de la description (lib/events.ts, getEvenementsEpingles).
--
-- Longueur : 200 caractères au plus, contrôlés aussi par la route
-- /api/admin/events/[id]/accroche (message d'erreur lisible). La contrainte
-- ici est le filet de sécurité. Une chaîne vide est refusée : la route
-- enregistre NULL à la place.
--
-- Droits : aucun GRANT. La lecture publique de `events` est accordée au
-- niveau de la table (la colonne est lisible comme les autres : c'est un
-- texte destiné à l'accueil). L'écriture passe exclusivement par le client
-- service_role de la route admin : INSERT/UPDATE/DELETE sont révoqués pour
-- anon et authenticated au niveau de la table (20260929120000_audit_n20_droits.sql)
-- et la policy « Block update events via anon » reste en place.

BEGIN;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS accroche TEXT;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_accroche_longueur;
ALTER TABLE public.events
  ADD CONSTRAINT events_accroche_longueur
  CHECK (accroche IS NULL OR (char_length(accroche) BETWEEN 1 AND 200));

COMMENT ON COLUMN public.events.accroche IS
  'Texte d''accroche du bloc « Épinglé » de l''accueil (200 caractères max, saisi par l''admin). NULL : repli sur le début de la description.';

COMMIT;

-- Vérification (à lancer après application) : la colonne existe, la
-- contrainte est en place, anon et authenticated ne peuvent pas l'écrire.
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'accroche';

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass AND conname = 'events_accroche_longueur';

SELECT r AS role,
       has_column_privilege(r, 'public.events', 'accroche', 'SELECT') AS lecture,
       has_column_privilege(r, 'public.events', 'accroche', 'UPDATE') AS ecriture
FROM unnest(ARRAY['anon', 'authenticated']) AS r;
