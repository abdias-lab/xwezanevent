-- Ajoute Celtiis aux moyens de virement possibles sur payouts.moyen.
-- Le CHECK initial (init_schema.sql) ne permettait que 'mtn'/'moov' alors
-- que Celtiis est le troisième opérateur Mobile Money béninois supporté
-- par FedaPay (déjà mentionné pour les acheteurs dans Billetterie.tsx et
-- paiement/echec, mais jamais proposé côté organisateur pour recevoir un
-- virement).
--
-- Le nom de la contrainte CHECK inline n'a jamais été fixé explicitement
-- (auto-généré par Postgres à la création de la table) : on la retrouve
-- dynamiquement via pg_constraint plutôt que de parier sur son nom, pour
-- que cette migration soit fiable et rejouable sans dépendre d'un nom
-- deviné.

DO $$
DECLARE
  contrainte TEXT;
BEGIN
  SELECT conname INTO contrainte
  FROM pg_constraint
  WHERE conrelid = 'public.payouts'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%moyen%';

  IF contrainte IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.payouts DROP CONSTRAINT %I', contrainte);
  END IF;
END $$;

ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_moyen_check CHECK (moyen IN ('mtn', 'moov', 'celtiis'));
