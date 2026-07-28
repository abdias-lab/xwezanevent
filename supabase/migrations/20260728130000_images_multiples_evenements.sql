-- Images multiples par événement (jusqu'à 4, appliqué côté application),
-- avec une image "principale" désignée (vignette/carte) et les autres
-- affichées en carrousel sur la page événement.
--
-- `events.affiche_url` reste en place et n'est PAS supprimée : elle devient
-- un cache dénormalisé de l'URL de l'image principale, tenu à jour par le
-- code applicatif à chaque changement (création ou édition). Ce choix évite
-- de réécrire toutes les requêtes de listing existantes (cartes accueil,
-- catalogue, ticker — lib/events.ts) en jointure sur cette nouvelle table ;
-- seule la page détail ira chercher `event_images` pour le carrousel complet.
--
-- Réutilise le bucket Storage "affiches" existant
-- (20260711120000_affiches_storage_bucket.sql, 5 Mo, jpeg/png/webp) : pas
-- de nouveau bucket, juste plusieurs fichiers par événement au lieu d'un
-- seul. L'upload reste exclusivement côté serveur via supabaseAdmin
-- (service_role) — voir 20260717200000_verrouille_upload_affiches.sql, qui
-- a déjà bloqué tout upload anon/authenticated direct sur ce bucket.
CREATE TABLE IF NOT EXISTS event_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  principale BOOLEAN NOT NULL DEFAULT false,
  ordre SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Une seule image principale par événement, garanti au niveau base (index
-- unique partiel) et pas seulement par la logique applicative : défense en
-- profondeur, cohérent avec le reste du projet (prix recalculés
-- serveur, jamais fait confiance au client seul).
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_images_une_principale
  ON event_images(event_id)
  WHERE principale;

-- Récupération ordonnée des images d'un événement pour le carrousel.
CREATE INDEX IF NOT EXISTS idx_event_images_event_id_ordre
  ON event_images(event_id, ordre);

-- Backfill depuis `events.affiche_url` — un événement sans affiche
-- (affiche_url IS NULL) n'obtient aucune ligne, comme aujourd'hui il n'a
-- simplement pas d'image. Garde par NOT EXISTS plutôt que ON CONFLICT : la
-- clé primaire `id` est un UUID aléatoire (pas de valeur stable à comparer),
-- donc c'est la présence d'au moins une ligne pour l'événement qui rend le
-- backfill rejouable sans doublon sur une relance accidentelle.
INSERT INTO event_images (event_id, url, principale, ordre)
SELECT id, affiche_url, true, 0
FROM events
WHERE affiche_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM event_images WHERE event_images.event_id = events.id
  );

-- ========================================
-- RLS
-- ========================================

ALTER TABLE event_images ENABLE ROW LEVEL SECURITY;

-- Lecture publique : images des événements publiés ou terminés, même
-- condition que la policy "Published and terminated events readable" sur
-- `events` (20260706130000_security_fixes.sql) et que
-- "Categories of published events are readable" sur `event_categories`
-- (20260728120000_categories_multiples_evenements.sql).
DROP POLICY IF EXISTS "Images of published events are readable" ON event_images;
CREATE POLICY "Images of published events are readable"
  ON event_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND statut IN ('publie', 'termine')
    )
  );

-- Organisateurs : images de leurs propres événements, tous statuts
-- (nécessaire pour /orga et le futur formulaire d'édition).
DROP POLICY IF EXISTS "Organisateurs can read images of their events" ON event_images;
CREATE POLICY "Organisateurs can read images of their events"
  ON event_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE id = event_id AND organisateur_id = auth.uid()
    )
  );

-- Admin : toutes les images, tous statuts.
DROP POLICY IF EXISTS "Admin can read all images" ON event_images;
CREATE POLICY "Admin can read all images"
  ON event_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Écriture bloquée côté anon/authenticated, même pattern que `events`
-- (20260717180000_verrouille_maj_evenements.sql) et `event_categories`
-- (20260728120000_categories_multiples_evenements.sql). Toutes les
-- écritures passent par supabaseAdmin (service_role, hors RLS) — création
-- (app/(orga)/creer/actions.ts) et future édition
-- (app/(orga)/orga/evenements/[id]/modifier/).
DROP POLICY IF EXISTS "Block insert images via anon" ON event_images;
CREATE POLICY "Block insert images via anon"
  ON event_images FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "Block update images via anon" ON event_images;
CREATE POLICY "Block update images via anon"
  ON event_images FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "Block delete images via anon" ON event_images;
CREATE POLICY "Block delete images via anon"
  ON event_images FOR DELETE
  USING (false);
