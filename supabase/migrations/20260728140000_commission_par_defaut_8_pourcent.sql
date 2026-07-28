-- Passe la commission par défaut de 6% à 8% pour tous les NOUVEAUX
-- événements. ALTER COLUMN ... SET DEFAULT ne modifie que la valeur
-- utilisée pour les futurs INSERT sans taux_commission explicite — jamais
-- les lignes déjà en base. Les taux déjà fixés restent donc inchangés,
-- notamment l'accord commercial à 0% de l'organisateur Jospin
-- (voir 20260726130000_taux_commission_par_evenement.sql, événement
-- 'concours-voice-talent-africa') et tout autre événement vitrine/test.
ALTER TABLE public.events
  ALTER COLUMN taux_commission SET DEFAULT 0.08;
