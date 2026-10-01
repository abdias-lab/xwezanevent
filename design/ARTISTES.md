# Pages artistes, comptes vérifiés, abonnements

Décisions d'Abdias du 2026-10-01. Schéma : `supabase/migrations/20261001120000_artistes_abonnements.sql`.

## Modèle

- **Artiste** : entité distincte d'un organisateur. Sur un événement : « Avec [artiste] » et
  « Organisé par [structure] ». Un artiste auto-produit est techniquement organisateur (il crée
  ses événements) ; « Organisé par » est masqué quand l'organisateur est le compte de l'artiste.
- **Créateurs** : un label (artistes de son écurie, `type_demande = label`, `label_id` = le label)
  ou un artiste auto-produit (`auto_produit`, `compte_id` = lui-même).
- **Page artiste** : « Label : … » relié au compte organisateur du label.

## Vérification (portée par le compte)

- Concerne **uniquement les labels et les artistes auto-produits**, qui fournissent leurs pièces
  hors plateforme (e-mail ou WhatsApp, appel si besoin) : statuts et mandat pour un label, pièce
  d'identité et liens réseaux pour un auto-produit. **Aucun téléversement de document.**
- Un organisateur ordinaire n'est jamais vérifié et ne fournit rien : ses événements passent par
  la validation habituelle ; la protection reste le séquestre J+3 des reversements.
- Compte vérifié : ses artistes sont validés et ses événements publiés **sans validation admin**.
  L'admin reçoit un e-mail à chaque publication d'un compte vérifié (surveillance, sans blocage).
- Compte non vérifié : première demande en validation, avec le message : la vérification protège
  les artistes contre l'usurpation de leur nom, l'équipe revient vers eux par e-mail pour la
  finaliser.
- Admin : « Valider » ou « Valider et vérifier le compte » sur les écrans de validation ; liste des
  comptes vérifiés, vérifier ou retirer la vérification (confirmation, journal). Un retrait ne
  touche pas ce qui est publié : seules les créations futures repassent en validation.
- Badge public « Vérifié » sur la page artiste et sur « Organisé par ».

## Validations

- Validations séparées : un événement suit son circuit et peut être publié avec un artiste encore
  en attente, affiché alors en texte simple, sans lien. Le lien apparaît à la validation.
- Artiste refusé déjà rattaché à un événement publié : masqué, organisateur prévenu par e-mail.
- Changement de nom de scène par un compte non vérifié : `nom_scene_demande`, en validation ; le
  nom actuel reste affiché. Bio, photo, réseaux : libres. Édition dans `/orga/artistes`.
- Rattachement : libre pour les artistes qu'on gère (créateur, label, compte de l'artiste) ;
  « proposé » pour les autres, invisible sur la page de l'artiste et non notifié jusqu'à l'accord
  du label, du compte de l'artiste ou de l'admin.
- Revendication d'une page par un artiste : rattachement de son compte par l'admin (phase 1).

## Demande de création

Nom de scène, label ou moi-même, réseaux (Instagram, Facebook, TikTok, YouTube, Spotify,
Audiomack, Boomplay, site web), bio et photo facultatives (repli typographique), **WhatsApp**
(canal principal de l'équipe).

## Abonnements et notifications

- Abonnement avec compte. Lien de désabonnement en un clic dans chaque e-mail (`jeton_desabonnement`).
- E-mail « nouvelle date » aux abonnés à la publication d'un événement (validation admin ou
  publication directe d'un compte vérifié) et à l'acceptation d'un rattachement proposé sur un
  événement publié et à venir. Pas d'envoi quand l'artiste est validé après coup. Tous les
  abonnés, quel que soit le pays. Un seul e-mail par abonné et par événement
  (`notifications_nouvelle_date`).
- Table `abonnements` prête pour suivre un organisateur (phase 2).

## Lots

1. Schéma ; admin (comptes vérifiés, file des artistes) ; `/orga/artistes` (demande, édition) ;
   `/artiste/[slug]`.
2. Création et modification d'événement (sélecteur d'artistes, demande d'un nouvel artiste,
   rattachement proposé), section « Avec », publication directe des comptes vérifiés et e-mail
   de surveillance à l'admin.
3. Abonnements, e-mails « nouvelle date », désabonnement.
