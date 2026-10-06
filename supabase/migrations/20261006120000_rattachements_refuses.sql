-- Rattachements d'artistes refusés (design/ARTISTES.md, lot 2).
--
-- Un rattachement « proposé » (artiste qu'un organisateur ne gère pas) attend
-- l'accord du label, du compte de l'artiste ou de l'admin. Jusqu'ici, seul
-- l'accord était possible ('accepte'). Un refus doit rester visible de
-- l'organisateur qui a proposé (fiche de l'événement, formulaire de
-- modification) : supprimer la ligne lui ferait relancer dans le vide. D'où un
-- troisième statut 'refuse', avec son auteur et sa date.
--
-- Aucune policy ni aucun droit à changer : evenement_artistes reste sans
-- accès client (REVOKE ALL, 20261001120000), lu et écrit par service_role.
--
-- refuse_par référence profiles comme propose_par et accepte_par. Aucun de
-- ces trois champs n'est dans la clé primaire : la table reste une liaison
-- events ↔ artistes seulement, sans nouveau chemin events ↔ profiles pour
-- PostgREST (leçon de l'incident n°26). À vérifier après application :
-- ouvrir une page événement publiée.

BEGIN;

-- Contrainte CHECK du statut, posée en ligne dans le CREATE TABLE : son nom
-- est généré par PostgreSQL, on la retrouve par sa définition.
DO $$
DECLARE
  c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.evenement_artistes'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%statut%'
  LOOP
    EXECUTE format('ALTER TABLE public.evenement_artistes DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

ALTER TABLE public.evenement_artistes
  ADD CONSTRAINT evenement_artistes_statut_check CHECK (statut IN ('accepte', 'propose', 'refuse')),
  ADD COLUMN IF NOT EXISTS refuse_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refuse_le  TIMESTAMP WITH TIME ZONE;

-- File des propositions en attente (Mes artistes, admin) : les plus anciennes d'abord.
CREATE INDEX IF NOT EXISTS evenement_artistes_proposes_idx
  ON public.evenement_artistes (created_at)
  WHERE statut = 'propose';

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Vérifications :
-- 1. une seule contrainte CHECK sur le statut, avec 'refuse' :
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.evenement_artistes'::regclass AND contype = 'c';
-- 2. les deux nouvelles colonnes :
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'evenement_artistes' AND column_name IN ('refuse_par', 'refuse_le');
