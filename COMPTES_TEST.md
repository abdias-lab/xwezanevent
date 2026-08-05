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

## Suivi du 2026-07-21 (renommage événement vitrine)

L'événement vitrine `vodun-days-2027` a été renommé en base par Abdias :
titre, slug (→ `racines-et-tambours-2027`) et description. Objectif : éviter
toute confusion avec la Fête du Vodoun officielle (même date, 10 janvier,
même ville, Ouidah). Aucun lien en dur vers l'ancien slug dans le code
(vérifié). `scripts/seed.mts` déjà aligné sur le nouveau nom.

## Test du 2026-07-28 (édition d'événement publié — catégories/images multiples, notification date)

Test en conditions réelles du flux d'édition organisateur ajouté ce jour
(`app/(orga)/orga/evenements/[id]/modifier/`) : création multi-catégories
(max 3) / multi-images (max 4) avec désignation d'image principale, édition
(description, heure, ajout/retrait d'image, catégories), notification email
sur changement de DATE, blocage d'accès croisé entre organisateurs.

Créés puis supprimés :
- `test-edition-orga-a@xwezanevent-test.com` / `test-edition-orga-b@xwezanevent-test.com`
  (organisateurs)
- Événement `[TEST] Édition multi-images` (3 catégories, jusqu'à 4 images), 1
  ticket_type, 1 commande payée (acheteur : compte admin réel `abdias@mentorshow.com`
  / `gbedoloabdias@gmail.com`, uniquement la commande de test a été créée puis
  supprimée — le compte lui-même n'a pas été touché)

Résultats :
1. Création : 3 catégories + 4 images enregistrées dans l'ordre choisi,
   `event_images.principale` et `events.affiche_url` (cache dénormalisé)
   cohérents. Limites respectées côté formulaire : la 4e catégorie et la 5e
   image sont refusées par l'UI (bouton désactivé / slot d'ajout masqué).
2. Édition sans changement de date (description, heure, retrait d'une image,
   changement de catégories) : base à jour, **aucun email envoyé** (attendu).
3. Édition avec changement de DATE : email envoyé avec succès via Resend
   (confirmé en log serveur + réception réelle à l'adresse de test) —
   fonctionne comme prévu.
4. Accès croisé : Organisateur Test B tente `/orga/evenements/<id de A>/modifier`
   → `404`, accès bloqué.

Aucun bug trouvé. Nettoyage complet en fin de session (comptes Auth + fichiers
Storage) — vérification automatisée : plus aucune trace en base ni dans le
bucket `affiches`.

## Incident du 2026-08-04 (achat invité — commande de test sur événement réel)

Pendant le test de la finalisation/email de l'achat invité (chantier guest
checkout, voir `supabase/migrations/20260804120000_achat_invite.sql`), un
achat de test (sandbox FedaPay, aucune somme réelle débitée) a été fait par
erreur sur **« Hollydays Colors »**, un événement d'un organisateur réel
(AHOUANDJINOU ENOCK), au lieu d'un événement de test dédié.

Commande créée : `cfee5c8a-a0d5-48bc-a4c2-5e34e830ed19`, 1 billet Standard
(5 000 FCFA), acheteur invité `gbedoloabdias@gmail.com`.

**Nettoyage appliqué par Abdias (SQL Editor Supabase) le 2026-08-04** :
billet et commande supprimés, `ticket_types.quantite_vendue` recrédité de 1.
Vérifié : ticket_type Standard revenu à 200 places / 0 vendu, état propre.
Aucune trace de cette commande de test dans le dashboard de l'organisateur.

Correctif de process pour la suite : toujours utiliser un événement de test
dédié (organisateur + event jetables, jamais un événement d'un organisateur
réel) — voir l'entrée du 2026-08-04 ci-dessous pour l'exemple appliqué juste
après.

## Test du 2026-08-04 (achat invité — confirmation / paiement-echec)

Test en conditions réelles de l'adaptation de `/confirmation`,
`/paiement/echec` et `/api/orders/[id]/reessayer` à l'achat invité (accès par
id de commande — UUID non devinable — plutôt que par session, pour les
commandes sans compte). Sur un événement de test dédié cette fois, suite à
l'incident ci-dessus.

Créés puis supprimés (cascade via suppression du compte Auth organisateur —
`profiles`/`events`/`orders`/`tickets` en `ON DELETE CASCADE`, vérifié en fin
de session : plus aucune trace) :
- `test-invite-orga@xwezanevent-test.com` (organisateur)
- Événement `test-achat-invite` (« [TEST] Achat invité — confirmation /
  paiement-echec »), 1 ticket_type Standard (100 FCFA × 50)
- 2 commandes invité (`gbedoloabdias@gmail.com`) : 1 payée (sandbox
  approuvé), 1 restée `en_attente` (sandbox non approuvé après relance —
  comportement du bac à sable, pas un bug applicatif)

Résultats :
1. Paiement invité approuvé → `/confirmation` affiche correctement titulaire,
   email et QR code sans passer par `/connexion` (accès par id de commande).
2. Paiement invité non abouti → `/paiement/echec` s'affiche sans passer par
   `/connexion`, et le bouton « Réessayer le paiement »
   (`/api/orders/[id]/reessayer`) fonctionne pour une commande invité (plus
   de blocage 401), génère bien une nouvelle transaction FedaPay sur la même
   commande.
3. Comptes/commandes liés à un compte authentifié : comportement inchangé
   (accès toujours vérifié via RLS `user_id = auth.uid()`, avant le repli
   invité).

Aucun bug trouvé. Nettoyage complet en fin de session — vérification
automatisée : plus aucune trace en base.

**Suivi du même jour — masquage de l'email sur `/confirmation`** : suite à
une question de sécurité (accès par id de commande seul = pas de mot de
passe/email à vérifier pour un invité ; l'email du titulaire s'affichait en
clair dans le HTML), `/confirmation` masque désormais l'email affiché
(`g•••@gmail.com`). Revérifié en conditions réelles sur un nouvel événement
de test dédié (`test-achat-invite`, organisateur + event + 1 commande
invité payée), même procédure de nettoyage complet en fin de session.
Confirmé également : aucun outil d'analytics/monitoring (Vercel Analytics,
Sentry, etc.) n'est configuré dans le projet — aucune dépendance de ce type
dans `package.json`, aucun script injecté dans `app/layout.tsx`, aucune
config dans `next.config.js`/`vercel.json` — donc aucune URL de
`/confirmation` ou `/paiement/echec` n'est envoyée à un service tiers.

## Test du 2026-08-04 (achat invité — "Retrouver mon billet" + recherche organisateur/export)

Test en conditions réelles du filet de sécurité indispensable pour un
invité qui perd son email de confirmation : `app/api/billets/retrouver`,
`lib/billets.ts::rechercherBillets` (recherche organisateur/admin, utilisée
par `/scan` → Recherche manuelle) et `recupererBilletsPourExport` (export
CSV) cherchent désormais aussi via `acheteur_email`/`acheteur_nom` en plus
du chemin compte existant. Sur événement de test dédié, comme pour les deux
sessions précédentes.

Créés puis supprimés (cascade via suppression du compte Auth organisateur,
vérifié en fin de session : plus aucune trace) :
- `test-retrouver-orga@xwezanevent-test.com` (organisateur)
- Événement `test-retrouver-billet-invite` (« [TEST] Retrouver mon billet —
  achat invité »), 1 ticket_type Standard (100 FCFA × 50)
- 1 commande invité payée (`gbedoloabdias@gmail.com` / « Fara Retrouvebillet
  Test »)

Résultats :
1. `POST /api/billets/retrouver` avec l'email de l'invité → email de
   confirmation effectivement renvoyé (confirmé en log serveur), alors
   qu'avant cette étape rien n'était trouvé pour une commande invité.
2. `/scan` → Recherche manuelle, en tant qu'organisateur connecté : le
   billet invité apparaît en cherchant par email, par nom (fragment), et
   par référence de commande (#XWZ-XXXXXXXX) — les trois modes.
3. Export CSV (`recupererBilletsPourExport`, vérifié directement contre la
   base réelle) : ligne de l'invité avec `acheteur_nom`/`acheteur_email`
   correctement remplis (plus de `"—"`).

Aucun bug trouvé. Nettoyage complet en fin de session — vérification
automatisée : plus aucune trace en base.

## Test du 2026-08-05 (fenêtre de 5 min sur le repli "déjà payé")

Bug remonté (comportement observé sur un achat réel, pas une commande de
test) : le repli "déjà payé" de `POST /api/orders` (ajouté suite à
l'audit E4, 2026-07-20) n'avait aucune fenêtre de temps — un acheteur
retentant le même type/quantité de billet, même des jours plus tard, était
systématiquement renvoyé vers sa commande déjà payée au lieu de pouvoir en
créer une nouvelle. Correctif : `FENETRE_DEJA_PAYEE_MS` (5 min) —
volontairement plus courte que `FENETRE_REUTILISATION_MS` (30 min, qui
répond à un problème différent), la race que ce repli couvre (webhook qui
finalise pendant une resoumission quasi simultanée) se joue en quelques
secondes.

Créés puis supprimés (cascade via suppression du compte Auth organisateur,
vérifié en fin de session : plus aucune trace) :
- `test-dedup-paye-orga@xwezanevent-test.com` (organisateur)
- Événement `test-dedup-commande-payee` (« [TEST] Dédup commande payée —
  fenêtre 5 min »), 1 ticket_type Standard (100 FCFA × 50)
- 2 commandes invité (`gbedoloabdias@gmail.com`), même panier (1×
  Standard) : 1 payée, 1 nouvelle créée après la fenêtre

Résultats :
1. Achat payé (sandbox approuvé), puis resoumission immédiate du même
   panier/email → toujours `409 { dejaPayee: true }`, toujours redirigé
   vers la commande existante (comportement inchangé dans la fenêtre).
2. `created_at` de la commande payée reculé à 6 min (simulé en base, même
   procédure que le test E4 du 2026-07-20) → resoumission du même
   panier/email → `200`, **nouvelle** commande créée (`16662b44-...`,
   `en_attente`, même `panier_signature`), commande payée d'origine
   (`bba9c497-...`) intacte.

Aucun bug trouvé après correctif. Nettoyage complet en fin de session —
vérification automatisée : plus aucune trace en base.

## Test du 2026-08-05 (récapitulatif unique — "Retrouver mon billet")

Amélioration produit : quand un acheteur a plusieurs commandes payées,
`POST /api/billets/retrouver` envoyait auparavant **un email séparé par
commande**. Nouveau comportement : un seul email récapitulatif regroupant
toutes les commandes/billets trouvés — nouveau template
`lib/emails/recapitulatif-billets.ts` (distinct du template "Paiement
confirmé", non touché), nouvelle fonction `envoyerRecapitulatifBillets`
dans `lib/commandes.ts` remplaçant `renvoyerConfirmationCommande` (supprimée).

Créés puis supprimés (cascade via suppression du compte Auth organisateur,
vérifié en fin de session) :
- `test-recap-orga@xwezanevent-test.com` (organisateur)
- 2 événements : `test-recap-billets-a` (2 billets Standard, 100 FCFA) et
  `test-recap-billets-b` (1 billet Standard, 200 FCFA)
- 2 commandes invité payées (`gbedoloabdias@gmail.com`)

Résultat : `POST /api/billets/retrouver` avec cet email → **un seul**
`[email] envoyé "Tes billets XwézanEvent (4 billets)"` en log (au lieu de
plusieurs emails séparés). Le récapitulatif a correctement regroupé les 2
commandes de test **et** une commande payée préexistante et non liée à ce
test (`948c41fa-...`, CONCOURS VOICE TALENT AFRICA, acheteur `Abdias` —
test manuel personnel, non touchée) : 3 commandes, 3 événements différents,
4 billets, un seul email. Bonne validation en conditions réelles du
regroupement multi-commandes/multi-événements.

Aucun bug trouvé. Nettoyage complet en fin de session (uniquement les 2
événements de test créés ici) — vérification automatisée : plus aucune
trace de `test-recap-orga@...`, commande `948c41fa-...` intacte.

## Comptes/événements de test actuellement en base

_Aucun à ce jour (voir nettoyages ci-dessus)._ Ajouter ici toute nouvelle
donnée de test créée d'ici le lancement (ex. via `npm run seed` ou
`npm run seed:payout-test`), pour ne pas la perdre de vue.

| Email / Événement | Rôle / Origine | Créé le |
|---|---|---|
| _(vide)_ | | |

Note (pas une donnée de test à nettoyer par nous) : une commande payée
réelle existe sur l'événement vitrine CONCOURS VOICE TALENT AFRICA
(`948c41fa-33fa-4369-9924-7716becea141`, acheteur `Abdias`,
`gbedoloabdias@gmail.com`, 1 billet, 1 000 FCFA, créée le 2026-08-04) —
test manuel personnel de l'achat invité. À garder en tête pour le nettoyage
final avant lancement (même logique que les autres comptes de test de ce
fichier), mais ne pas la supprimer sans confirmation.
