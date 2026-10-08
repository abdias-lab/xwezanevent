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
- **Pas de passe-droit pour l'admin** (décision d'Abdias du 2026-10-08) : une date qu'il crée pour
  un artiste qu'il ne gère pas reste « proposée », y compris depuis « Ajouter une date » de la page
  artiste. C'est volontaire : la promesse faite aux artistes est que personne ne peut les afficher
  sans leur accord, et l'admin ne fait pas exception. Quand un label ne répond pas, la file des
  propositions de `/admin/artistes` suffit pour trancher.
- Revendication d'une page par un artiste : rattachement de son compte par l'admin (phase 1).

## Retrait et suppression par l'admin

Décisions d'Abdias du 2026-10-08 (migration `20261008130000_retrait_artistes.sql`).

- **Retirer** un artiste en ligne : statut `retire`. Page en 404, absent des sections « Avec »,
  plus d'abonnement possible ni d'e-mail « nouvelle date », plus proposé dans le sélecteur ni
  acceptable en proposition. Fiche, rattachements et abonnements restent en base : **réversible**
  (« Remettre en ligne »). Côté organisateur, la fiche de l'événement affiche « Retiré par
  l'équipe » ; le label voit « Retiré par l'équipe » dans Mes artistes et ne peut pas le remettre
  en ligne lui-même.
- Trace sur la fiche (`retire_le`, `retire_par` sans clé étrangère, `retire_par_nom` figé,
  `motif_retrait`) et au journal. E-mail au compte qui gère l'artiste seulement si la case
  « prévenir » reste cochée ; motif envoyé seulement s'il est saisi.
- L'admin voit le nombre d'abonnés sur chaque carte ; la confirmation du retrait l'annonce en clair.
- **Supprimer définitivement** : seulement sans aucun rattachement (proposé, accepté ou refusé) ni
  abonné. Contrôle refait sous verrou par `supprimer_artiste` au moment du clic : rattachements et
  abonnements sont supprimés en cascade avec l'artiste, ce contrôle est le seul garde-fou. Trace au
  journal (instantané nom, slug, statut, admin) ; photo retirée du stockage.

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
- Déclencheurs (`lib/nouvelle-date.ts`) : validation admin, publication directe d'un compte
  vérifié, acceptation d'un rattachement proposé (label ou admin), ajout dans `/modifier` d'un
  artiste géré à un événement déjà en ligne (décision d'Abdias du 2026-10-07).
- Conditions : événement publié, à venir, **vente ouverte** (au moins un tarif non complet dont la
  vente n'est pas close) ; jamais d'e-mail pour un événement complet ou à la vente close.
- Registre écrit **après** chaque lot Resend réussi (100 e-mails, validation stricte), jamais
  avant : les abonnés d'un lot en échec restent non marqués. Relance :
  `POST /api/admin/events/[id]/nouvelle-date` (admin), qui ne sert que les non-marqués ; pas
  encore de bouton dans l'admin.
- En-têtes `List-Unsubscribe` et `List-Unsubscribe-Post` (désabonnement en un clic natif des
  messageries, `/api/desabonnement/[jeton]`). E-mail au gabarit V2 (`lib/emails/v2/gabarit.ts`).

### Limites connues

- **L'envoi « nouvelle date » se fait dans la requête qui le déclenche** (validation admin,
  publication, `/modifier`, acceptation) et la fait attendre. Acceptable au volume actuel
  (décision d'Abdias du 2026-10-07). Mesures du 2026-10-07 (build de prod local, 1 à 3
  abonnés) : environ 1,5 s de coût fixe par envoi, puis de l'ordre de 20 ms par abonné (adresse
  e-mail lue une à une dans l'API d'auth, 10 en parallèle, et un appel Resend par lot de 100).
  **Seuil : au-delà d'environ 300 abonnés cumulés sur les artistes d'un même événement**, l'envoi
  dépasse quelques secondes et approche la durée maximale d'une fonction Vercel (10 s sans
  configuration sur l'ancien runtime ; à vérifier dans Vercel, Settings › Functions). Il faudra
  alors sortir l'envoi de la requête : file d'envois traitée par une tâche planifiée (pg_cron ou
  cron Vercel), qui reprend aussi les lots en échec. Suivre la durée dans le journal du serveur
  (`[nouvelle-date] … ms`).
- Deux déclenchements simultanés pour le même événement (ex. deux acceptations à la même
  seconde) peuvent viser les mêmes abonnés avant l'écriture du registre. La clé d'idempotence
  Resend par lot évite le double envoi d'un lot identique ; un recouvrement partiel reste
  possible, rare au volume actuel.

## Lots

1. Schéma ; admin (comptes vérifiés, file des artistes) ; `/orga/artistes` (demande, édition) ;
   `/artiste/[slug]`.
2. Création et modification d'événement (sélecteur d'artistes, demande d'un nouvel artiste,
   rattachement proposé), section « Avec », publication directe des comptes vérifiés et e-mail
   de surveillance à l'admin.
3. Abonnements, e-mails « nouvelle date », désabonnement.
