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

## Test du 2026-08-05/06 (catalogue public — contexte pays, étape 3 du chantier multi-pays)

Ajout du sélecteur pays (drapeau, header + menu mobile), filtrage du
catalogue public (accueil, /evenements, /evenements?ville=…) par
`pays_code`, et remplacement de la liste de villes codée en dur de
`FiltreVille.tsx` par `getVillesPubliees(pays)`. Point de vigilance du
diagnostic initial : la page détail d'un événement, le checkout et la
confirmation ne doivent jamais être filtrés par pays (lien partagé,
ex. WhatsApp, doit toujours s'ouvrir).

Togo (`pays.actif`) temporairement activé pour la durée du test — config
globale, pas un événement de test isolé — puis redésactivé en fin de
session (vérifié : `bj` actif / `tg` inactif, état identique à avant le
test).

Créés puis supprimés (cascade via suppression du compte Auth organisateur) :
- `test-catalogue-orga@xwezanevent-test.com` (organisateur)
- Événement `test-evenement-togo` (« [TEST] Événement Togo »,
  `pays_code='tg'`), 1 ticket_type Standard (100 FCFA × 10)

Résultats :
1. Sélecteur invisible tant qu'un seul pays est actif (comportement par
   défaut, confirmé avant et après le test — apparence du site identique).
2. Togo actif → sélecteur `BJ ▾`/`TG ▾` visible, dropdown fonctionnel.
3. Contexte Bénin (par défaut) : `/evenements` liste les 2 événements
   béninois réels, exclut l'événement togolais de test ; filtre Ville
   n'affiche que « Ouidah » (les événements béninois réels), preuve que
   la liste n'est plus codée en dur (elle affichait 6 villes fixes avant
   ce chantier, qu'il y ait ou non des événements dans chacune).
4. Contexte Togo (sélecteur) : `/evenements` liste **uniquement**
   l'événement togolais de test, catégorie « Concert » uniquement, ville
   « Cotonou » uniquement (donnée de l'événement de test) — exclut
   totalement les 2 événements béninois.
5. **Point de vigilance validé** : contexte remis sur Bénin, puis accès
   direct à `/evenement/test-evenement-togo` (lien type WhatsApp) →
   page événement togolaise s'affiche normalement, aucun filtre par pays
   sur la page détail.

Aucun bug trouvé. Nettoyage complet en fin de session (compte + événement
de test, désactivation du Togo) — vérification automatisée : plus aucune
trace, table `pays` revenue à son état initial.

## Test du 2026-08-09 (commission par défaut variable par pays)

Test en conditions réelles de `supabase/migrations/20260809120000_taux_commission_defaut_par_pays.sql`
(colonne `pays.taux_commission_defaut`) et de son branchement dans
`app/(orga)/creer/actions.ts` : le taux de commission d'un événement à sa
création est désormais lu depuis le pays choisi, plus depuis le `DEFAULT`
fixe de la colonne `events.taux_commission`.

Togo temporairement activé pour la durée du test, avec un
`taux_commission_defaut` volontairement différent du Bénin (0,055 au lieu
de 0,08) — le seul moyen de prouver que l'événement togolais reçoit bien la
valeur de la table `pays` et non une coïncidence avec le `DEFAULT` de
colonne (les deux étant à 0,08 en usage normal). Restauré à 0,08 en fin de
session (valeur définitive laissée au choix d'Abdias, voir la migration).

Créés puis supprimés (cascade via suppression du compte Auth organisateur) :
- `test-commission-orga@xwezanevent-test.com` (organisateur)
- Événement `test-commission-benin` (« [TEST] Commission Bénin »,
  `pays_code='bj'`), 1 ticket_type Standard (1 000 FCFA × 50)
- Événement `test-commission-togo` (« [TEST] Commission Togo »,
  `pays_code='tg'`), 1 ticket_type Standard (1 000 FCFA × 50)

Résultat : événement béninois créé avec `taux_commission = 0.08` (attendu),
événement togolais créé avec `taux_commission = 0.055` (attendu, valeur de
test distincte du DEFAULT) — confirmé par requête directe en base après
soumission du vrai formulaire `/creer` dans le navigateur (pas de bypass).

Aucun bug applicatif trouvé. Nettoyage complet en fin de session (comptes +
événements de test, Togo redésactivé, `taux_commission_defaut` du Togo
remis à 0,08) — vérification automatisée : plus aucune trace en base, table
`pays` revenue à son état initial.

**Incident de nettoyage découvert après coup** : le nettoyage ci-dessus a
remis `tg.actif` à `false` sans avoir lu son état réel avant modification —
supposé à tort à partir de l'historique de ce fichier plutôt que vérifié en
base. Abdias avait en fait activé `tg` manuellement avant cette session ;
le nettoyage l'a donc écrasé par erreur (corrigé manuellement par Abdias
après coup). Correctif de méthode appliqué dès le test suivant : toujours
lire l'état réel d'une config partagée avant de la modifier, restaurer
exactement cette valeur capturée plutôt qu'une valeur supposée.

## Test du 2026-08-09 (reversements — Togo, Flooz/Mixx by Yas)

Test en conditions réelles de l'étape 4 du chantier multi-pays
(`lib/telephone.ts`, `supabase/migrations/20260809130000_payouts_multi_pays.sql`) :
généralisation de la demande de virement organisateur au Togo (opérateurs
Flooz/Mixx by Yas, numéros à 8 chiffres) en plus du Bénin (MTN/Moov/Celtiis,
10 chiffres). Table `pays` non modifiée pour ce test (bj et tg déjà tous
deux `actif=true` — état lu et vérifié identique avant et après, voir
correctif de méthode ci-dessus).

Créés puis supprimés (tickets → commandes → payouts → ticket_types →
événements → compte, dans cet ordre explicite plutôt que via cascade) :
- `test-payout-multipays-orga@xwezanevent-test.com` (organisateur)
- Événement `test-payout-benin` (« [TEST] Payout BJ », `pays_code='bj'`,
  daté J-7 pour satisfaire le délai J+3), 1 ticket_type Standard, 1 commande
  invité payée (3 billets, `gbedoloabdias@gmail.com`)
- Événement `test-payout-togo` (« [TEST] Payout TG », `pays_code='tg'`,
  même montage), 1 ticket_type Standard, 1 commande invité payée

Résultats (demandes soumises via le vrai formulaire `/orga`, navigateur) :
1. Événement béninois : sélecteur « Moyen de paiement » propose MTN/Moov/
   Celtiis. Demande soumise en Celtiis avec un numéro à 8 chiffres (`97 12
   34 56`) → complété automatiquement en `0197123456` (10 chiffres),
   confirmé à l'écran avant envoi. Stocké en base : `moyen=celtiis`,
   `numero_destination=0197123456`.
2. Événement togolais : sélecteur ne propose QUE Flooz/Mixx by Yas (aucun
   MTN/Moov/Celtiis). Demande soumise en Mixx by Yas avec `92345678` (8
   chiffres, aucun complément — comportement attendu, le Togo n'a pas
   l'équivalent de la tolérance "ancien format" du Bénin). Stocké en base :
   `moyen=yas`, `numero_destination=92345678`.
3. Les deux formats ont été acceptés par le CHECK desserré
   (`^[0-9]{8,10}$`) sans erreur — confirme que la migration
   20260809130000 fonctionne pour les deux pays.
4. `/orga/reversements` affiche les deux numéros correctement groupés par 2
   chiffres (`01 97 12 34 56` et `92 34 56 78`) — confirme que le retrait du
   garde `\d{10}` dans `formaterNumero` (déplacé vers `lib/telephone.ts`)
   fonctionne pour les deux longueurs.
5. `/admin/reversements` non testé en conditions réelles (pas d'accès au
   mot de passe du compte admin réel `gbedoloabdias@gmail.com` — refus
   délibéré de le réinitialiser pour un test) : cette page importe
   exactement la même fonction `formaterNumero` que `/orga/reversements`,
   déjà vérifiée en conditions réelles.

Aucun bug applicatif trouvé. Nettoyage complet en fin de session (ordre
explicite, pas de cascade) — vérification automatisée : plus aucune trace
en base, table `pays` confirmée inchangée (lue avant ET après le test).

**Suivi du 2026-08-10 — nettoyage en réalité incomplet, corrigé** : une
vérification finale demandée séparément a trouvé le compte
`test-payout-multipays-orga@xwezanevent-test.com` toujours présent, alors
que la session ci-dessus l'annonçait supprimé. Cause : le script de
nettoyage n'inspectait pas l'erreur retournée par
`supabaseAdmin.auth.admin.deleteUser()`, qui échouait silencieusement
(500). Cause racine trouvée : `journal_actions.acteur_id` référence
`profiles(id)` **sans** `ON DELETE CASCADE` (contrairement à `payouts` et
`events`) — les deux entrées de journal « demande de virement » créées par
ce test bloquaient la suppression en cascade du profil. Corrigé en
supprimant d'abord ces deux lignes de journal (vérifiées comme bien
issues de ce test avant suppression), puis le compte — confirmé
définitivement absent (Auth + `profiles`). Deux processus `next dev`
orphelins (ports 3000/3001, lancés lors de tests précédents) trouvés
encore actifs malgré un `TaskStop` déjà exécuté — arrêtés. Événement
`test-paiement-live` et ses 2 entrées de journal (2026-07-12/18)
identifiés comme appartenant au compte vitrine « Bénin Live Events »
(`est_demo=true`), donc volontairement non touchés.

⚠️ **Point de vigilance pour les prochains nettoyages** : `deleteUser()`
peut échouer silencieusement si le compte a des lignes dans
`journal_actions` (pas de cascade sur cette table). Toujours vérifier
`error` sur cet appel, ou supprimer `journal_actions` pour l'acteur avant
le compte — ne pas se fier au seul message affiché par le script sans
relecture derrière.

**Correctif appliqué le même jour** : migration
`20260810120000_journal_actions_acteur_id_set_null.sql` — `acteur_id`
passe en `ON DELETE SET NULL` (au lieu de RESTRICT implicite), pour
préserver l'historique du journal même après suppression d'un compte,
cohérent avec `payouts`/`events` (déjà en CASCADE).

## Audit de non-régression du 2026-08-10 (chantier multi-pays + reversements)

Demandé en fin de session, focalisé sur UNE question : les changements du
jour (`taux_commission_defaut` par pays, sélecteur pays à la création,
généralisation des reversements au Togo, correctif `journal_actions`)
cassent-ils quoi que ce soit pour le Bénin ? Vérifié point par point, en
conditions réelles quand possible, jamais sur les comptes réels de Jospin
ou Hollydays Colors.

Créés puis supprimés (événement + compte organisateur + compte acheteur,
ordre explicite : billets → commandes → ticket_types → événement →
comptes) :
- `test-regression-bj-orga@xwezanevent-test.com` /
  `test-regression-bj-acheteur@xwezanevent-test.com`
- Événement `test-regression-benin` (« [TEST] Régression Bénin »), créé
  via le vrai formulaire `/creer` sans toucher au sélecteur pays, 1
  ticket_type Standard (2 000 FCFA), 1 commande **avec compte** (pas
  invité), 1 billet

Résultats :
1. **Achat avec compte** : `POST /api/orders` réel (authentifié, pas de
   bypass) → commande créée avec `user_id` renseigné et `acheteur_nom`/
   `acheteur_email`/`acheteur_telephone` tous `NULL` — chemin compte pur,
   jamais mélangé avec les champs invité. Resoumission immédiate du même
   panier → même `orderId` (dédup intacte). `finaliserCommande` (identique
   à l'appel webhook réel) → `"ok"`, 1 billet généré, stock décrémenté,
   email « Paiement confirmé » réellement envoyé via Resend. Resoumission
   après paiement → `409 dejaPayee:true`, comportement inchangé. Aucune
   régression : `app/api/orders/route.ts` et `lib/commandes.ts` n'ont
   d'ailleurs reçu aucune modification aujourd'hui (vérifié par
   `git diff --stat` sur les commits du jour).
2. **Commissions existantes** : lecture directe en base (jamais modifiée) —
   Jospin (`concours-voice-talent-africa`) et Hollydays Colors
   (`hollydays-colors-2`) tous deux à `taux_commission=0`, `pays_code='bj'`.
   Écart avec l'hypothèse de départ (8% pour Hollydays Colors) confirmé par
   Abdias comme volontaire : 0% offert aux deux comme stratégie de
   lancement pour ses premiers organisateurs — pas une régression. Confirmé
   sans lien avec le code de toute façon : cet événement a été créé le
   2026-07-28 à 06h34, avant même la migration qui a fait passer le défaut
   à 8% (14h00 le même jour), et aucun code du jour ne touche
   `events.taux_commission` sur une ligne existante (seul l'`INSERT` à la
   création lit `taux_commission_defaut`).
3. **Création d'événement bj normale** : sélecteur pays pré-rempli sur
   `bj` sans interaction, soumission via le vrai formulaire → événement
   créé avec `pays_code='bj'` et `taux_commission=0.08`. Rien de cassé par
   l'ajout du sélecteur/de la détection IP.
4. **Virement béninois** : preuve par diff — `normaliserBenin` dans
   `lib/telephone.ts` est identique caractère pour caractère à l'ancien
   `normaliserNumeroBenin` de `lib/payouts.ts` ; `MOYENS_PAIEMENT` bj
   inchangé (mtn/moov/celtiis). Complète le test réel déjà effectué la
   veille (Celtiis, 8→10 chiffres, voir plus haut).
5. **Catalogue public** : session navigateur fraîche, aucun cookie pays
   posé → accueil affiche « La billetterie du Bénin » / « Tout le Bénin »,
   `/evenements` liste exactement les 2 événements béninois réels (aucun
   événement togolais), comportement identique à la session de référence
   du 2026-08-05/06.
6. **Liens directs Jospin/Hollydays Colors** : les deux pages événement
   chargent normalement (titre, organisateur, billetterie, moyens de
   paiement MTN/Moov/Celtiis) — vérifié en lecture seule, aucun achat
   déclenché sur ces comptes réels. `getEvenementParSlug` confirmé non
   filtré par `pays_code` (relecture de code). `/api/scan` et
   `lib/billets.ts` confirmés sans aucune référence à `pays`.

**Deux processus `next dev` orphelins retrouvés à nouveau après `TaskStop`**
(même symptôme que la veille) — tués via PID après vérification du port.

Aucune régression trouvée. Point soulevé sur la commission de Hollydays
Colors (voir point 2) confirmé volontaire par Abdias le jour même.

## Audit du 2026-08-21 (vérification en base réelle)

Demande : confirmer si des comptes de test « n'ont plus lieu d'être »
traînent encore en base, au-delà de ce que ce fichier documente déjà.
Vérification en lecture seule (`auth.users`, `profiles`, `events`, `orders`,
`tickets` interrogés directement via `supabaseAdmin`) — **aucune
suppression effectuée**, décision laissée à Abdias.

Confirmé : aucun compte au format `test-*@xwezanevent-test.com` ne traîne
(la convention de nommage des sessions ci-dessus a bien été respectée à
chaque nettoyage). En revanche, deux comptes personnels d'Abdias utilisés
pour tester en conditions réelles n'étaient trackés nulle part dans ce
fichier — voir tableau ci-dessous.

Repéré au passage : l'événement `test-paiement-live` (« Test Paiement
Live ») porte 3 commandes ratées/abandonnées côté Bénin Live Events
(`echoue`/`en_attente`) en plus de la commande payée que sa migration
(`20260726120000_test_paiement_live_demo.sql`) documente déjà comme
volontairement conservée — ces 3-là n'étaient pas mentionnées.

**Suivi du même jour — vérification que les commandes `en_attente` sur les
événements de Jospin et Hollydays Colors ne sont pas de vraies tentatives
de clients**, demandée avant toute décision de nettoyage. Vérifié via
`acheteur_nom`/`acheteur_email`/`acheteur_telephone` (pas seulement les
dates) :
- `36cca6d9…` (Hollydays Colors, 5 000 F) : nom « Marie », mais email
  `gbedoloabdias@gmail.com` et téléphone `0197965989` — ceux d'Abdias.
- `9b4828c0…` (Hollydays Colors, 5 000 F) : nom « Aïcha **Test** Invitée »,
  email `invite.test@xwezan-test.com` — explicitement un test.
- `102ae0d4…` (Concours Voice Talent Africa, 1 000 F) : nom « abdias »,
  email `gbedoloabdias@gmail.com`.
- `f13788d5…` (Concours Voice Talent Africa, 1 000 F) : nom « julie »,
  email `julien@gmail.com` (incohérent avec le nom), mais téléphone
  `0197965989` — encore celui d'Abdias, sous une 3e identité différente.

**Conclusion : confirmé résidus de test, pas des clients réels** — le même
téléphone (`0197965989`) revient sous trois identités fictives différentes
(« Marie », « abdias », « julie »). Seule vraie vente sur ces deux
événements : `46445f53…` sur Hollydays Colors (« ALIDOU »,
`almolevrai@gmail.com`, `0190388966` — aucun lien avec Abdias), billet
valide, **à garder**.

Cas distinct : `4e5c24b8…` (Concours Voice Talent Africa, 1 000 F,
`en_attente`) a été passée par le compte de **Jospin lui-même** (pas un
invité fictif) — ni un test d'Abdias, ni un client. Probablement Jospin
testant son propre événement après création — comportement normal d'un
organisateur, pas du bruit de test à nettoyer. **Décision d'Abdias
(2026-08-21) : conservée telle quelle, aucune suppression.**

Aucun impact stock à prévoir pour un nettoyage éventuel : `reserver_stock_billet()`
(qui décrémente `ticket_types.quantite_vendue`) n'est appelé que dans
`finaliserCommande()` au moment du paiement, jamais à la création d'une
commande `en_attente` — vérifié en base, `quantite_vendue` des ticket_types
concernés ne reflète que les ventes réellement payées.

## Comptes/événements de test actuellement en base

Table mise à jour suite à l'audit ci-dessus. Rien n'a été supprimé sauf
mention contraire — décisions restantes à trancher par Abdias.

| Compte / Commande | Rôle / Origine | Créé le | À faire |
|---|---|---|---|
| `abdiasmentorverfi@gmail.com` (« Marc », visiteur) | Compte personnel d'Abdias, utilisé comme acheteur pour valider le paiement live sur `test-paiement-live` (billet payé + utilisé, **à garder**, voir migration `20260726120000`) | 2026-07-21 | Compte gardé (porte la commande payée) |
| → 3 commandes abandonnées de « Marc » : `7ac36e9f…` (5 000 F, Racines & Tambours), `2d36c733…` (10 000 F, Nuit de l'Afrobeat), `f949a4c5…` (5 000 F, **Hollydays Colors** — événement d'un organisateur réel) | `en_attente`, jamais finalisées | 2026-07-22 / 2026-08-05 | **Supprimées le 2026-08-21** (script relu et exécuté par Abdias, 0 ligne restante vérifié) |
| `gbedoloabdias+testy@gmail.com` (« Abdias », visiteur) | Compte personnel d'Abdias (plus-adressing sur son propre email) | 2026-08-04 | Revérifié le 2026-08-21 : 0 ligne dans `orders`/`events`/`payouts`/`journal_actions` — aucune donnée liée. Script de suppression (compte + profil) préparé, en attente de relecture/exécution par Abdias |
| 3 commandes `echoue`/`en_attente` de Bénin Live Events sur `test-paiement-live` (`317db7b7…`, `00b82bcb…`, `5736e42b…`) | Tentatives ratées avant la commande payée conservée | 2026-07-22 / 2026-07-24 | Script de nettoyage préparé le 2026-08-21, en attente de relecture/exécution par Abdias |
| Commande `en_attente` de Jospin sur son propre événement (`4e5c24b8…`, 1 000 F) | Compte réel, Jospin testant probablement son propre événement — comportement normal d'organisateur | 2026-07-26 | **Conservée** (décision d'Abdias, 2026-08-21) — pas du bruit de test à nettoyer |
| Commandes invité `en_attente` sur **Hollydays Colors** (`9b4828c0…`, `36cca6d9…`) et **Concours Voice Talent Africa** (`102ae0d4…`, `f13788d5…`) | Confirmées résidus de test d'Abdias (email/téléphone d'Abdias sous identités fictives, voir audit ci-dessus) | 2026-08-04 / 2026-08-05 / 2026-08-10 | Suppression confirmée par Abdias le 2026-08-21 — script préparé, en attente d'exécution |

Note (pas une donnée de test à nettoyer par nous) : une commande payée
réelle existe sur l'événement vitrine CONCOURS VOICE TALENT AFRICA
(`948c41fa-33fa-4369-9924-7716becea141`, acheteur `Abdias`,
`gbedoloabdias@gmail.com`, 1 billet, 1 000 FCFA, créée le 2026-08-04) —
test manuel personnel de l'achat invité. À garder en tête pour le nettoyage
final avant lancement (même logique que les autres comptes de test de ce
fichier), mais ne pas la supprimer sans confirmation.
