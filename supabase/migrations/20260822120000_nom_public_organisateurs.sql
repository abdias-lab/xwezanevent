-- Sépare le nom civil (profiles.nom, saisi une fois à l'inscription) du nom
-- de marque/scène qu'un organisateur veut afficher publiquement sur ses
-- événements. Constat : le bloc « Organisé par » de la page événement
-- publique (app/(public)/evenement/[slug]/page.tsx, via
-- lib/events.ts::getEvenementParSlug) affiche aujourd'hui profiles.nom tel
-- quel — un organisateur inscrit avec son nom civil complet (ex.
-- « AHOUANDJINOU ENOCK ») le voit affiché publiquement au lieu d'un nom de
-- marque qu'il choisirait.
--
-- nom_public est NULLABLE avec repli sur nom (COALESCE côté application,
-- pas en base — voir lib/events.ts) : aucune migration de données requise
-- pour les organisateurs existants qui n'ont pas encore renseigné ce champ,
-- rien de cassé pour eux.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nom_public TEXT;

-- Même traitement que la colonne `nom` (voir 20260706130000_security_fixes.sql,
-- ligne ~100) : colonne publique par nature, donc lisible par anon/public
-- (visiteur non connecté sur la page événement) et authenticated (visiteur
-- connecté). Les GRANT SELECT sur `profiles` sont explicites colonne par
-- colonne depuis ce fichier (REVOKE SELECT ON profiles FROM public/anon a
-- retiré le privilège par défaut sur toute la table) : une colonne ajoutée
-- sans GRANT explicite reste invisible pour anon/public, même si la ligne
-- passe la policy RLS.
GRANT SELECT (nom_public) ON public.profiles TO anon;
GRANT SELECT (nom_public) ON public.profiles TO public;
GRANT SELECT (nom_public) ON public.profiles TO authenticated;

-- UPDATE volontairement non re-déclaré ici : aucune migration précédente
-- n'a jamais restreint UPDATE sur `profiles` colonne par colonne (recherché
-- dans tout supabase/migrations/, seul SELECT l'a été) — le GRANT UPDATE
-- de base accordé par Supabase à la création du projet couvre donc déjà
-- toute colonne, y compris celle-ci, protégé uniquement par la policy RLS
-- "Users can update own profile info" (auth.uid() = id) et le trigger
-- anti-escalade de rôle. À VÉRIFIER concrètement une fois le formulaire
-- /orga branché (prochaine étape) : qu'un organisateur connecté peut bien
-- écrire sa propre ligne `nom_public` via le client Supabase, avant de
-- considérer cette hypothèse confirmée.

-- ========================================
-- Migration de « Bénin Live Events » : ce compte vitrine (abdias@mentorshow.com,
-- id ci-dessous) a eu son profiles.nom directement renommé en « Bénin Live
-- Events » lors du nettoyage du 2026-07-19 (voir COMPTES_TEST.md), avant
-- que cette distinction nom civil / nom public n'existe. On répare : le nom
-- de marque part dans nom_public (nouvelle colonne, sa vraie place), et nom
-- revient à une valeur civile neutre — décision Abdias 2026-08-22 : "Abdias",
-- cohérent avec les autres comptes personnels déjà en base (testy → "Abdias",
-- admin → "Aris").
--
-- Guard sur l'ancienne valeur de nom en plus de l'id : si cette ligne a déjà
-- été retouchée depuis l'audit, cette migration ne fait rien plutôt que
-- d'écraser un état imprévu.
-- ========================================

UPDATE public.profiles
SET nom_public = 'Bénin Live Events',
    nom = 'Abdias'
WHERE id = 'dd2ccbf1-82a8-4d84-9cae-36f53f700376'
  AND nom = 'Bénin Live Events';

-- Vérification à lancer juste après (doit retourner exactement 1 ligne,
-- avec nom='Abdias' et nom_public='Bénin Live Events') :
-- SELECT id, nom, nom_public FROM public.profiles
-- WHERE id = 'dd2ccbf1-82a8-4d84-9cae-36f53f700376';
