-- Corrige C1 (audit sécurité) : la policy RLS INSERT sur `events` ne
-- restreignait que `organisateur_id`/`role`, jamais `statut`,
-- `mis_en_avant` ou `ordre_affiche`. Le trigger `prevent_unauthorized_status_change`
-- ne s'exécute que sur UPDATE (OLD n'existe pas sur INSERT) : rien ne
-- protégeait donc un INSERT direct via l'API REST Supabase (clé anon +
-- JWT d'un compte "organisateur", rôle obtenu automatiquement à la 1re
-- soumission de /creer) qui aurait pu publier/mettre en avant un
-- événement sans passer par la modération admin.
--
-- Deux lignes de défense, rejouable (DROP IF EXISTS avant chaque CREATE) :
--   1. Policy RLS INSERT resserrée (statut/mis_en_avant/ordre_affiche).
--   2. Trigger BEFORE INSERT, même logique que prevent_unauthorized_status_change :
--      service_role/postgres passent librement (flux applicatif /creer,
--      qui écrit via supabaseAdmin), tout autre appelant est bloqué s'il
--      tente statut hors ('brouillon','en_validation'), mis_en_avant=true
--      ou ordre_affiche renseigné.

-- ========================================
-- 1. Policy RLS INSERT resserrée
-- ========================================

DROP POLICY IF EXISTS "Organisateurs can insert events" ON events;
CREATE POLICY "Organisateurs can insert events"
  ON events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('organisateur', 'admin')
    )
    AND organisateur_id = auth.uid()
    AND statut IN ('brouillon', 'en_validation')
    AND mis_en_avant = false
    AND ordre_affiche IS NULL
  );

-- ========================================
-- 2. Trigger BEFORE INSERT (défense en profondeur)
-- ========================================

CREATE OR REPLACE FUNCTION prevent_unauthorized_event_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role/postgres (flux applicatif /creer via supabaseAdmin) passent librement
  IF current_user IN ('service_role', 'postgres') THEN
    RETURN NEW;
  END IF;

  IF NEW.statut NOT IN ('brouillon', 'en_validation') THEN
    RAISE EXCEPTION 'Unauthorized: statut initial doit être brouillon ou en_validation';
  END IF;

  IF NEW.mis_en_avant IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Unauthorized: mis_en_avant ne peut pas être défini à la création, réservé à l''administrateur';
  END IF;

  IF NEW.ordre_affiche IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: ordre_affiche ne peut pas être défini à la création, réservé à l''administrateur';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

DROP TRIGGER IF EXISTS prevent_event_insert_abuse ON events;
CREATE TRIGGER prevent_event_insert_abuse
  BEFORE INSERT ON events
  FOR EACH ROW
  EXECUTE PROCEDURE prevent_unauthorized_event_insert();
