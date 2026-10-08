-- Pages artistes, comptes vérifiés et abonnements (phase 1).
--
-- Contexte : recruter des musiciens auto-produits et des labels qui vendent
-- les billets de leurs concerts. Un artiste est une entité distincte d'un
-- organisateur : sur un événement, « Avec [artiste] » et « Organisé par
-- [structure] » peuvent coexister. Décisions d'Abdias du 2026-10-01.
--
-- 1. comptes_verifies : la vérification porte sur le COMPTE (label ou
--    artiste auto-produit, pièces fournies hors plateforme par e-mail ou
--    WhatsApp), pas sur chaque publication. Un compte vérifié publie ses
--    artistes et ses événements sans validation admin (l'admin reçoit un
--    e-mail à chaque publication, sans blocage). Un particulier qui monte
--    une soirée n'est jamais vérifié : ses événements passent par la
--    validation habituelle, et le séquestre J+3 des reversements le couvre.
--    Table séparée et non colonne de profiles : la policy « Users can update
--    own profile info » laisse chaque utilisateur modifier sa ligne
--    profiles (seul role y est protégé par trigger) ; une colonne verifie_le
--    y serait donc auto-attribuable. Retirer la vérification = supprimer la
--    ligne (journal_actions) ; ce qui est publié reste en ligne.
--
-- 2. artistes : créés par un label (pour son écurie) ou par un artiste
--    auto-produit (pour lui-même). En validation et invisibles du public
--    tant que le compte créateur n'est pas vérifié. Un changement de nom de
--    scène par un compte non vérifié passe par nom_scene_demande : le nom
--    actuel reste affiché jusqu'au feu vert (risque d'usurpation). Bio,
--    photo et réseaux restent modifiables librement.
--
-- 3. evenement_artistes : « Avec » sur la page événement. Rattachement
--    libre pour les artistes que l'organisateur gère (créateur, label ou
--    compte de l'artiste) ; « propose » pour les autres, invisible sur la
--    page de l'artiste et non notifié aux abonnés jusqu'à l'accord du
--    label, du compte de l'artiste ou de l'admin.
--
-- 4. abonnements : un utilisateur (avec compte) suit un artiste ; colonne
--    organisateur_id prévue pour suivre un organisateur en phase 2.
--    jeton_desabonnement : lien de désabonnement en un clic dans les e-mails.
--
-- 5. notifications_nouvelle_date : un abonné reçoit un seul e-mail par
--    événement, même s'il suit plusieurs de ses artistes ou si l'envoi est
--    redéclenché (publication, puis acceptation d'un rattachement).
--
-- Droits : RLS activée partout, aucune écriture pour anon/authenticated
-- (routes serveur via service_role). Seuls les artistes validés sont
-- lisibles publiquement, et seulement leurs colonnes affichables (droit de
-- table révoqué puis colonnes accordées une à une : un REVOKE de colonne
-- seul est sans effet). Les autres tables n'ont aucun accès client.

BEGIN;

-- ========================================
-- 1. Comptes vérifiés
-- ========================================
CREATE TABLE IF NOT EXISTS public.comptes_verifies (
  user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  verifie_le  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  verifie_par UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note        TEXT CHECK (note IS NULL OR char_length(note) <= 500)
);
ALTER TABLE public.comptes_verifies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comptes_verifies FROM anon, authenticated;

-- ========================================
-- 2. Artistes
-- ========================================
CREATE TABLE IF NOT EXISTS public.artistes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom_scene          TEXT NOT NULL CHECK (char_length(nom_scene) BETWEEN 1 AND 80),
  nom_scene_demande  TEXT CHECK (nom_scene_demande IS NULL OR char_length(nom_scene_demande) BETWEEN 1 AND 80),
  bio                TEXT CHECK (bio IS NULL OR char_length(bio) <= 2000),
  photo_url          TEXT,
  -- {instagram, facebook, tiktok, youtube, spotify, audiomack, boomplay, site} :
  -- URL vérifiées côté serveur (domaines autorisés).
  liens              JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(liens) = 'object'),
  type_demande       TEXT NOT NULL CHECK (type_demande IN ('label', 'auto_produit')),
  -- Compte organisateur du label (page artiste : « Label : … ») ; NULL pour un auto-produit.
  label_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Compte de l'artiste lui-même (auto-produit, ou rattaché par l'admin en phase 1).
  compte_id          UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
  cree_par           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- Canal principal de l'équipe pour obtenir les pièces (interne).
  whatsapp_contact   TEXT CHECK (whatsapp_contact IS NULL OR char_length(whatsapp_contact) <= 30),
  statut             TEXT NOT NULL DEFAULT 'en_validation' CHECK (statut IN ('en_validation', 'valide', 'refuse')),
  motif_refus        TEXT CHECK (motif_refus IS NULL OR char_length(motif_refus) <= 1000),
  soumis_le          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valide_le          TIMESTAMP WITH TIME ZONE,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS artistes_statut_idx ON public.artistes (statut);
CREATE INDEX IF NOT EXISTS artistes_label_idx ON public.artistes (label_id) WHERE label_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS artistes_cree_par_idx ON public.artistes (cree_par);

DROP TRIGGER IF EXISTS update_artistes_updated_at ON public.artistes;
CREATE TRIGGER update_artistes_updated_at
  BEFORE UPDATE ON public.artistes
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

ALTER TABLE public.artistes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Artistes valides lisibles par tous" ON public.artistes;
CREATE POLICY "Artistes valides lisibles par tous"
  ON public.artistes FOR SELECT
  TO anon, authenticated
  USING (statut = 'valide');
REVOKE ALL ON public.artistes FROM anon, authenticated;
GRANT SELECT (id, slug, nom_scene, bio, photo_url, liens, label_id, statut, created_at)
  ON public.artistes TO anon, authenticated;

-- ========================================
-- 3. Liaison événements ↔ artistes
-- ========================================
CREATE TABLE IF NOT EXISTS public.evenement_artistes (
  event_id     UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  artiste_id   UUID NOT NULL REFERENCES public.artistes(id) ON DELETE CASCADE,
  ordre        SMALLINT NOT NULL DEFAULT 0,
  statut       TEXT NOT NULL DEFAULT 'accepte' CHECK (statut IN ('accepte', 'propose')),
  propose_par  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepte_par  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepte_le   TIMESTAMP WITH TIME ZONE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, artiste_id)
);
CREATE INDEX IF NOT EXISTS evenement_artistes_artiste_idx ON public.evenement_artistes (artiste_id);
ALTER TABLE public.evenement_artistes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evenement_artistes FROM anon, authenticated;

-- ========================================
-- 4. Abonnements
-- ========================================
CREATE TABLE IF NOT EXISTS public.abonnements (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artiste_id           UUID REFERENCES public.artistes(id) ON DELETE CASCADE,
  organisateur_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  jeton_desabonnement  UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(artiste_id, organisateur_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS abonnements_user_artiste_idx
  ON public.abonnements (user_id, artiste_id) WHERE artiste_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS abonnements_user_organisateur_idx
  ON public.abonnements (user_id, organisateur_id) WHERE organisateur_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS abonnements_artiste_idx ON public.abonnements (artiste_id) WHERE artiste_id IS NOT NULL;
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.abonnements FROM anon, authenticated;

-- ========================================
-- 5. Journal des notifications « nouvelle date »
-- ========================================
CREATE TABLE IF NOT EXISTS public.notifications_nouvelle_date (
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  envoye_le  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);
ALTER TABLE public.notifications_nouvelle_date ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications_nouvelle_date FROM anon, authenticated;

COMMIT;

-- ========================================
-- Vérification (à lancer après application)
-- ========================================
-- a) Tables et RLS.
SELECT c.relname AS table_, c.relrowsecurity AS rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('comptes_verifies', 'artistes', 'evenement_artistes', 'abonnements', 'notifications_nouvelle_date')
ORDER BY 1;

-- b) Droits clients : seul SELECT sur les colonnes publiques d'artistes doit valoir true.
SELECT r AS role,
       has_table_privilege(r, 'public.comptes_verifies', 'SELECT') AS comptes_verifies_lecture,
       has_table_privilege(r, 'public.abonnements', 'SELECT') AS abonnements_lecture,
       has_table_privilege(r, 'public.evenement_artistes', 'SELECT') AS liaison_lecture,
       has_column_privilege(r, 'public.artistes', 'nom_scene', 'SELECT') AS artistes_nom_lecture,
       has_column_privilege(r, 'public.artistes', 'whatsapp_contact', 'SELECT') AS artistes_whatsapp_lecture,
       has_column_privilege(r, 'public.artistes', 'cree_par', 'SELECT') AS artistes_createur_lecture,
       has_table_privilege(r, 'public.artistes', 'INSERT') AS artistes_ecriture
FROM unnest(ARRAY['anon', 'authenticated']) AS r;
-- Attendu : tout à false, sauf artistes_nom_lecture = true.
