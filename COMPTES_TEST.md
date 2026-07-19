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

## Comptes/événements de test actuellement en base

_Aucun à ce jour (voir nettoyage ci-dessus)._ Ajouter ici toute nouvelle
donnée de test créée d'ici le lancement (ex. via `npm run seed` ou
`npm run seed:payout-test`), pour ne pas la perdre de vue.

| Email / Événement | Rôle / Origine | Créé le |
|---|---|---|
| _(vide)_ | | |
