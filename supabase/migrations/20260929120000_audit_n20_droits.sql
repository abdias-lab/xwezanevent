-- Audit n°20 (design/BUGS_REFONTE.md) : écarts entre les migrations et la
-- base de production, constatés le 2026-09-29.
-- Date: 2026-09-29
--
-- 1. events : la migration 20260717130000_verrouille_insertion_evenements.sql
--    n'avait jamais été appliquée. La policy « Organisateurs can insert
--    events » (20260717120000) restait en place : un organisateur pouvait
--    insérer un événement directement par l'API, sans passer par /creer, en
--    choisissant lui-même taux_commission (0 compris), est_demo, etc. Le
--    trigger prevent_event_insert_abuse ne contrôle que statut,
--    mis_en_avant et ordre_affiche. Toutes les écritures légitimes passent
--    par supabaseAdmin (service_role, qui contourne la RLS).
DROP POLICY IF EXISTS "Organisateurs can insert events" ON public.events;
DROP POLICY IF EXISTS "Block insert events via anon" ON public.events;
CREATE POLICY "Block insert events via anon"
  ON public.events FOR INSERT
  WITH CHECK (false);

-- 2. events : les REVOKE UPDATE (taux_commission) et (lien_scan_token) de
--    20260726130000 et 20260811120000 étaient sans effet. Retirer un droit
--    sur une COLONNE ne fait rien tant que le droit sur la TABLE est
--    accordé, et Supabase accorde par défaut INSERT/UPDATE/DELETE sur toutes
--    les tables à anon et authenticated. La protection réelle venait de la
--    RLS (« Block update events via anon », USING false). On retire les
--    droits d'écriture de table : aucune écriture ne passe par ces rôles.
REVOKE INSERT, UPDATE, DELETE ON public.events FROM anon, authenticated;

-- 3. profiles : même cause, conséquence réelle. Le REVOKE SELECT (telephone)
--    de 20260717140000 était sans effet, et la policy « Profiles public info
--    readable » (USING true) laisse lire toutes les lignes : tout compte
--    connecté (inscription libre) pouvait lire le téléphone de tous les
--    utilisateurs (13 profils constatés le 2026-09-29). On retire le droit
--    de table et on n'accorde que les colonnes non sensibles. Le code lit les
--    téléphones via supabaseAdmin (pages admin) : rien ne casse en prod.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, nom, role, created_at, updated_at, nom_public) ON public.profiles TO authenticated;
