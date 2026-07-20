# Comptes de test — à nettoyer avant le lancement

Ces comptes existent uniquement pour les tests manuels / seed en développement.
**À supprimer (Supabase Auth + tables associées) juste avant la mise en
production**, en un seul nettoyage groupé.

## Nettoyage du 2026-07-19 (préparation démo commerciale)

Nettoyage complet effectué en vue d'une démo auprès de vrais organisateurs.
Comptes supprimés : `organisateur@xwezanevent-test.com`, `admin-test@xwezanevent-test.com`,
`acheteur@xwezanevent-test.com`, ainsi que `gbedolosarah@gmail.com` (compte
oublié, vide, aucune donnée rattachée).

Les 3 événements vitrine (`vodun-days-2027`, `nuit-de-l-afrobeat-2027`,
`soiree-zouk-and-love-2027`) ont été **conservés** mais :
- transférés du compte de test vers `abdias@mentorshow.com` (compte réel,
  conservé) — sinon ils auraient été supprimés en cascade avec le compte de
  test ;
- `profiles.nom` de ce compte renommé en **« Bénin Live Events »** pour un
  affichage crédible en démo (ce nom n'apparaît que dans `/admin` et dans le
  tableau de bord `/orga` du compte lui-même — la page publique d'un
  événement n'affiche pas l'organisateur) ;
- toutes les commandes/billets de test qui y étaient rattachés ont été
  supprimés et `ticket_types.quantite_vendue` remis à 0 : ces 3 événements
  démarrent la démo avec des compteurs propres.

⚠️ **Ne pas relancer `npm run seed`** sans y penser : le script recréerait le
compte `organisateur@xwezanevent-test.com` (il ne retoucherait pas les 3
événements vitrine, déjà réattribués par slug, mais réintroduirait un compte
de test à re-nettoyer avant le vrai lancement).

## Test du 2026-07-20 (déduplication de commandes, E4)

Test en conditions réelles de la migration `20260720120000_dedoublonnage_commandes_en_attente.sql`
(index unique partiel empêchant la création de commandes en double) contre
la base réelle, une fois la migration appliquée par Abdias. Comptes et
événement créés spécifiquement pour ce test, **tous supprimés en fin de
session** (`tickets`, `orders`, `ticket_types`, `events`, comptes Auth) —
vérification finale automatisée : plus aucune trace en base.

Créés puis supprimés :
- `test-dedup-orga@xwezanevent-test.com` (organisateur)
- `test-dedup-acheteur@xwezanevent-test.com` (acheteur)
- Événement `test-dedoublonnage-commandes` (« [TEST] Dédoublonnage commandes »), 1 ticket_type

Résultats :
1. Deux `POST /api/orders` quasi simultanés, même panier → une seule
   commande créée (même `orderId` dans les deux réponses).
2. Commande finalisée (payée), puis re-tentative du même panier →
   **bug trouvé et corrigé en direct** : l'index unique ne couvrant que
   `statut='en_attente'`, une commande payée ne bloquait plus un nouvel
   `INSERT` identique (doublon créé au premier essai, `200` au lieu de
   `409`). Correctif : vérification explicite « déjà payée » ajoutée
   avant la tentative d'insertion (`app/api/orders/route.ts`). Après
   correctif, retesté avec succès → `409 { dejaPayee: true }`, aucun
   doublon.
3. Commande `en_attente` reculée à 31 min (simulée en base), même panier
   re-tenté → nouvelle commande créée normalement (`200`, nouvel
   `orderId`), l'ancienne passée en `echoue`. **Confirmé : un achat
   légitime n'est jamais bloqué.**

Correctif poussé directement sur `main` (commit `9ef1e47`) suite à ce
test — la version précédente sur `main` (commit `528a971`/`d9a3dfd`)
avait la faille du point 2 ci-dessus.

## Comptes/événements de test actuellement en base

_Aucun à ce jour (voir nettoyages ci-dessus)._ Ajouter ici toute nouvelle
donnée de test créée d'ici le lancement (ex. via `npm run seed` ou
`npm run seed:payout-test`), pour ne pas la perdre de vue.

| Email / Événement | Rôle / Origine | Créé le |
|---|---|---|
| _(vide)_ | | |
