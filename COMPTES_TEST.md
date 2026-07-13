# Comptes de test — à nettoyer avant le lancement

Ces comptes existent uniquement pour les tests manuels / seed en développement.
**À supprimer (Supabase Auth + tables associées) juste avant la mise en
production**, en un seul nettoyage groupé.

| Email | Rôle | Origine | Créé le |
|---|---|---|---|
| organisateur@xwezanevent-test.com | organisateur | `npm run seed` (scripts/seed.mts) | 2026-07-08 |
| admin-test@xwezanevent-test.com | admin | créé manuellement en session de test | 2026-07-09 |
| acheteur@xwezanevent-test.com | visiteur | créé pour tester le parcours d'échec de paiement (voir commit sur `paiement/echec`) | 2026-07-13 |

Les événements de seed (`vodun-days-2027`, `nuit-de-l-afrobeat-2027`,
`soiree-zouk-and-love-2027`, organisés par `organisateur@xwezanevent-test.com`)
et les commandes de test associées sont à supprimer avec.
