-- Marque les événements "vitrine" (démo) : visibles publiquement (accueil,
-- listings, page détail) mais dont la billetterie doit être désactivée
-- pour empêcher un achat réel sur un événement fictif — maintenant qu'on
-- est en live et indexé par Google, un visiteur pourrait sinon payer un
-- vrai billet pour un événement qui n'existe pas.
--
-- Le blocage réel est côté serveur (app/api/orders/route.ts et
-- app/api/orders/[id]/reessayer/route.ts, voir ces fichiers) : cette
-- colonne n'est pas qu'un indicateur d'affichage, elle est vérifiée avant
-- toute création/relance de commande.
--
-- Aucune policy RLS ni GRANT à ajouter : `events` n'a pas de restriction
-- de colonne (contrairement à `profiles`), la policy existante
-- "Published and terminated events readable" (USING statut IN ('publie',
-- 'termine')) couvre déjà cette nouvelle colonne pour la lecture publique.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS est_demo BOOLEAN NOT NULL DEFAULT false;

UPDATE public.events
SET est_demo = true
WHERE slug IN (
  'racines-et-tambours-2027',
  'nuit-de-l-afrobeat-2027',
  'soiree-zouk-and-love-2027'
);
