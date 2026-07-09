-- Ajoute le panier (snapshot de la sélection) à la commande.
-- Nécessaire pour que le webhook FedaPay génère les billets APRÈS paiement
-- (les tickets ne sont plus créés à la création de la commande).
-- Format : [{ "ticket_type_id": "...", "nom": "...", "prix": 5000, "quantite": 2 }]
ALTER TABLE orders ADD COLUMN IF NOT EXISTS panier JSONB;
