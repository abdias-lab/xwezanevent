-- Marque « Test Paiement Live » comme événement vitrine/démo, au même titre
-- que les 3 événements de démonstration commerciale (voir
-- 20260722120000_evenements_demo.sql). Cet événement a servi à valider le
-- paiement en conditions live et porte une commande/un billet réels : on le
-- retire du public sans supprimer ces données (le garde-fou anti-suppression
-- de /api/admin/events/[id]/supprimer les protège de toute façon).
--
-- Effet immédiat : exclu de tous les listings publics (lib/events.ts), page
-- /evenement/[slug] toujours accessible par lien direct avec badge démo,
-- toute nouvelle commande bloquée côté serveur (app/api/orders/route.ts et
-- .../reessayer/route.ts).
UPDATE public.events
SET est_demo = true
WHERE slug = 'test-paiement-live';
