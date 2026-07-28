-- Catégories multiples par événement (jusqu'à 3, appliqué côté application).
--
-- Jusqu'ici `events.categorie` est une colonne TEXT unique : un événement ne
-- peut appartenir qu'à une seule des 6 catégories fixes définies côté client
-- (components/FormulaireCreation.tsx, liste CATEGORIES). Cette table de
-- liaison permet plusieurs catégories par événement. `events.categorie`
-- n'est PAS supprimée ici : le code applicatif bascule sur cette nouvelle
-- table dans le même déploiement, et une migration de nettoyage séparée
-- supprimera la colonne une fois vérifié qu'elle n'est plus lue nulle part.
--
-- Pas de contrainte SQL sur le nombre de catégories (max 3, imposé côté
-- application) ni sur les valeurs autorisées (les 6 catégories fixes) :
-- `events.categorie` n'a jamais eu ce genre de contrainte non plus (TEXT
-- libre, liste fermée uniquement côté UI) — on garde la même répartition
-- des responsabilités plutôt que d'introduire une contrainte que la colonne
-- d'origine n'avait pas.
CREATE TABLE IF NOT EXISTS event_categories (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  categorie TEXT NOT NULL,
  ordre SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, categorie)
);

-- Filtre public par catégorie (getEvenementsPublies) et listes distinctes /
-- compteurs (getCategoriesPubliees, getCompteursCategories) : tous cognent
-- sur cette colonne.
CREATE INDEX IF NOT EXISTS idx_event_categories_categorie ON event_categories(categorie);

-- Backfill depuis la colonne existante — un événement sans catégorie
-- (categorie IS NULL) n'obtient aucune ligne, comme aujourd'hui il n'a
-- simplement pas de badge. ON CONFLICT DO NOTHING pour rester rejouable :
-- sur une relance, les lignes déjà backfillées sont ignorées plutôt que de
-- provoquer une erreur de clé primaire.
INSERT INTO event_categories (event_id, categorie, ordre)
SELECT id, categorie, 0
FROM events
WHERE categorie IS NOT NULL
ON CONFLICT (event_id, categorie) DO NOTHING;

-- ========================================
-- RLS
-- ========================================

ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;

-- Lecture publique : catégories des événements publiés ou terminés, même
-- condition que la policy "Published and terminated events readable" sur
-- `events` (20260706130000_security_fixes.sql) — un visiteur ne doit pas
-- voir les catégories d'un événement en brouillon/en validation/refusé.
DROP POLICY IF EXISTS "Categories of published events are readable" ON event_categories;
CREATE POLICY "Categories of published events are readable"
  ON event_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND statut IN ('publie', 'termine')
    )
  );

-- Organisateurs : catégories de leurs propres événements, tous statuts
-- (nécessaire pour /orga et le futur formulaire d'édition).
DROP POLICY IF EXISTS "Organisateurs can read categories of their events" ON event_categories;
CREATE POLICY "Organisateurs can read categories of their events"
  ON event_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND organisateur_id = auth.uid()
    )
  );

-- Admin : toutes les catégories, tous statuts.
DROP POLICY IF EXISTS "Admin can read all categories" ON event_categories;
CREATE POLICY "Admin can read all categories"
  ON event_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Écriture bloquée côté anon/authenticated, même pattern que `events`
-- (20260717180000_verrouille_maj_evenements.sql) et `ticket_types`
-- (20260706120000_init_schema.sql) : la colonne équivalente existante n'a
-- jamais été modifiable par le client, il n'y a aucune raison que sa
-- table de remplacement le devienne. Toutes les écritures passent par
-- supabaseAdmin (service_role, hors RLS) — création
-- (app/(orga)/creer/actions.ts) et future édition
-- (app/(orga)/orga/evenements/[id]/modifier/).
DROP POLICY IF EXISTS "Block insert categories via anon" ON event_categories;
CREATE POLICY "Block insert categories via anon"
  ON event_categories FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block update categories via anon" ON event_categories;
CREATE POLICY "Block update categories via anon"
  ON event_categories FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Block delete categories via anon" ON event_categories;
CREATE POLICY "Block delete categories via anon"
  ON event_categories FOR DELETE
  USING (false);
