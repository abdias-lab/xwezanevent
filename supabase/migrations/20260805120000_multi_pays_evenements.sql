-- Extension multi-pays (Togo, puis potentiellement Côte d'Ivoire) : étape 1
-- du chantier — fondations données uniquement. Rien côté formulaire de
-- création, catalogue public ou reversements dans cette migration (voir les
-- étapes suivantes du plan).
--
-- Table de référence plutôt qu'un CHECK enum sur events.pays_code : avec un
-- CHECK, chaque nouveau pays exigerait une migration pour étendre la liste.
-- Avec une table, ajouter un pays = une ligne insérée, et elle donne un
-- endroit naturel pour accrocher la config par pays (indicatif, fuseau —
-- utile aux étapes suivantes du chantier, notamment la normalisation des
-- numéros Mobile Money au reversement).
--
-- `actif` permet de merger le Togo dans le code (formulaire, catalogue,
-- reversements) AVANT de l'ouvrir commercialement : tant que actif=false,
-- aucun sélecteur ne le proposera, mais la structure est en place et
-- testable.

-- ========================================
-- 1. Table pays
-- ========================================

CREATE TABLE IF NOT EXISTS public.pays (
  code TEXT PRIMARY KEY,                          -- ISO 3166-1 alpha-2 minuscule : 'bj', 'tg'…
  nom TEXT NOT NULL,                               -- "Bénin"
  drapeau TEXT NOT NULL,                           -- "🇧🇯" (emoji natif, pas d'asset à charger)
  indicatif TEXT NOT NULL,                         -- "+229"
  devise TEXT NOT NULL DEFAULT 'XOF',              -- identique Bénin/Togo/Côte d'Ivoire (zone UEMOA)
  fuseau_offset_minutes INTEGER NOT NULL,          -- 60 pour Bénin ET Togo (même fuseau, pas d'heure d'été)
  actif BOOLEAN NOT NULL DEFAULT false,
  ordre INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.pays (code, nom, drapeau, indicatif, fuseau_offset_minutes, actif, ordre)
VALUES
  ('bj', 'Bénin', '🇧🇯', '+229', 60, true, 0),
  ('tg', 'Togo', '🇹🇬', '+228', 60, false, 1)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 2. RLS : lecture publique, écriture réservée à service_role
-- ========================================
-- Même modèle que ticket_types (init_schema.sql) : la table est gérée
-- directement en base par l'équipe (ex. activer 'tg' le jour du lancement
-- commercial togolais), jamais via un flux client — donc tous les writes
-- anon/authenticated sont bloqués, service_role (qui bypass RLS
-- nativement) reste seul à pouvoir écrire.

ALTER TABLE public.pays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pays lisible par tous"
  ON public.pays FOR SELECT
  USING (true);

CREATE POLICY "Bloque insertion pays via anon"
  ON public.pays FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Bloque modification pays via anon"
  ON public.pays FOR UPDATE
  USING (false);

CREATE POLICY "Bloque suppression pays via anon"
  ON public.pays FOR DELETE
  USING (false);

-- ========================================
-- 3. events.pays_code
-- ========================================
-- DEFAULT 'bj' conservé durablement (pas seulement pour le backfill) : tant
-- que l'étape "formulaire de création" n'est pas livrée, tout nouvel
-- événement reste implicitement béninois, comportement actuel inchangé.
-- NOT NULL + DEFAULT ensemble : sûr sans réécriture de table (Postgres
-- moderne), aucune ligne existante ne peut violer la contrainte puisque
-- toutes reçoivent 'bj' au passage de cette migration.
--
-- Aucune policy RLS à toucher sur events : les policies SELECT/INSERT/
-- UPDATE existantes (statut, organisateur_id, role) ne dépendent pas de
-- cette colonne.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS pays_code TEXT NOT NULL DEFAULT 'bj' REFERENCES public.pays(code);

-- Utilisé par le filtrage du catalogue public (étape suivante du chantier :
-- getEvenementsPublies, getEvenementsTicker, etc. filtreront par pays_code).
CREATE INDEX IF NOT EXISTS idx_events_pays_code ON public.events(pays_code);
