-- Corrige E2 (audit sécurité) : la policy RLS "Profiles public info
-- readable" (USING (true), 20260706130000_security_fixes.sql) rend
-- TOUTES les lignes de `profiles` visibles en lecture par tout rôle. Le
-- GRANT SELECT (..., telephone, ...) ON profiles TO authenticated
-- (même fichier, ligne 105) accorde ensuite la colonne `telephone` sur
-- CES MÊMES lignes — Postgres n'a pas de RLS par colonne, donc dès
-- qu'une ligne passe la policy USING(true), les colonnes accordées à
-- `authenticated` sont lisibles pour n'importe quelle ligne, pas
-- seulement celle de l'appelant. Résultat : tout utilisateur connecté
-- peut lire le téléphone de tous les autres utilisateurs via l'API REST
-- (GET /rest/v1/profiles?select=id,nom,telephone).
--
-- Vérifié : `telephone` n'est lu nulle part dans app/ ni lib/ (colonne
-- collectée à l'inscription par handle_new_user, jamais consommée
-- ailleurs que via supabaseAdmin, qui a de toute façon accès complet en
-- service_role et n'est pas affecté par ce REVOKE). Retrait pur du
-- privilège en trop, aucune fonctionnalité existante ne dépend de son
-- accès via le rôle `authenticated`.

REVOKE SELECT (telephone) ON profiles FROM authenticated;
