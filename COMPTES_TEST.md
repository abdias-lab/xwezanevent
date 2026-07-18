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

## Événements ad hoc (retest demande de virement)

Créés via `npm run seed:payout-test` (`scripts/seed-payout-test.mts`), un
nouvel événement à chaque exécution (slug horodaté) pour retester le
formulaire de demande de virement (MTN/Moov/Celtiis) avec le délai J+3 déjà
satisfait. Supprimer la ligne `events` correspondante suffit (cascade sur
`ticket_types`/`orders`/`tickets`) ; supprimer le compte
`organisateur@xwezanevent-test.com` ou `acheteur@xwezanevent-test.com` (voir
tableau ci-dessus) supprime aussi tout le reste en cascade.

| Slug événement | Commande | Créé le |
|---|---|---|
| `test-virement-2026-07-18T17-02-45` | `6b3571ac-269f-4240-b53c-65ceebfd7d8b` | 2026-07-18 |
