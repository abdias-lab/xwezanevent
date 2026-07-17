-- Ajoute le numéro de destination Mobile Money aux demandes de virement.
-- `payouts` n'avait que `moyen` (mtn/moov) : rien ne reliait une demande à
-- un numéro précis, l'admin devait aller chercher le contact ailleurs
-- pour effectuer le virement manuel.
--
-- Décision produit : le numéro est saisi par l'organisateur à CHAQUE
-- demande (pas repris de profiles.telephone), pour qu'il soit cohérent
-- avec le moyen choisi au même moment et que l'organisateur assume
-- explicitement la destination de son argent.
--
-- Vérifié avant d'écrire cette migration : `payouts` est vide en
-- production (0 ligne) — NOT NULL direct sans backfill ni DEFAULT.
--
-- Format : Bénin est passé le 30 novembre 2024 à une numérotation à 10
-- chiffres (préfixe "01" ajouté devant les anciens numéros à 8 chiffres).
-- Stocké normalisé (01 + 8 chiffres, sans espaces ni indicatif) par la
-- route serveur avant insertion — cette contrainte CHECK est un filet de
-- sécurité en base, pas la validation principale.
--
-- Immuabilité : déjà garantie sans changement supplémentaire ici — les
-- policies "Block update/delete payouts via anon" (init_schema.sql,
-- sans clause TO donc appliquées à tous les rôles client) bloquent déjà
-- toute modification post-création via anon/authenticated, et la route
-- admin de traitement (/api/admin/payouts/[id]/traiter) ne met à jour
-- que statut/traite_le, jamais numero_destination.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS numero_destination TEXT NOT NULL;

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS numero_destination_format;
ALTER TABLE public.payouts
  ADD CONSTRAINT numero_destination_format CHECK (numero_destination ~ '^01[0-9]{8}$');
