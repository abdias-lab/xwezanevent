# XwézanEvent

## Projet

XwézanEvent est une billetterie en ligne pour le Bénin : concerts, festivals, soirées,
culture. Commission de 8% côté organisateur. Paiement Mobile Money via FedaPay.
Billets avec QR code. Application PWA.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind
- Supabase (région eu-west-3), RLS strict sur toutes les tables
- FedaPay en **LIVE** en production (clés live sur Vercel) : de l'argent réel est en
  jeu. Les tests se font en local, en sandbox (`.env.local`), jamais sur le live
- Resend en production, domaine xwezan.com vérifié, expéditeur piloté par
  `RESEND_FROM_EMAIL`
- Déploiement Vercel automatique sur push vers `main`

Le projet Vercel est **déjà configuré**. Ne jamais proposer de le réimporter ou de le
reconfigurer depuis zéro.

## Design

Système "Doré", figé :

- Couleurs : `#151009` (fond), `#E4A93F` (doré), `#C24E2A` (secondaire), `#F3EADA` (ivoire)
- Polices : Bricolage Grotesque / Instrument Sans / Space Grotesk
- Logo typographique "XwézanEvent" collé (aucune icône) : "Xwézan" en Playfair Display
  italique gras doré + "Event" en Instrument Sans ivoire
- Slogan : « Mì wá dó djawá ! »
- `maquettes/` = archives HTML de référence, ne pas modifier

## Règles de sécurité

- Jamais de secrets dans le code ni dans les conversations
- Écritures sensibles exclusivement via `lib/supabase-admin.ts` (server-only)
- Les prix sont toujours recalculés côté serveur, jamais fait confiance au client
- Tout `CREATE OR REPLACE` d'une fonction `SECURITY DEFINER` doit re-déclarer ses
  `REVOKE`/`GRANT`
- Les migrations SQL sont appliquées manuellement par Abdias dans le SQL Editor
  Supabase, après relecture — ne jamais les exécuter automatiquement
- Le repo est la source de vérité

## Conventions de travail

- Avancer par petites étapes
- Build ET test réel avant chaque commit
- Un commit par fonctionnalité
- Échanges en français

## État actuel

Produit fonctionnellement terminé et testé. Voir `COMPTES_TEST.md` pour la liste des
comptes de test à nettoyer avant le lancement.

## Reste avant lancement

- Nettoyage des comptes de test
- Audit de sécurité externe
- Revérifier le cas « paiement annulé » en conditions live

## Après le lancement

- **Relance automatique des paiements abandonnés** (pas avant d'avoir dépassé une
  dizaine d'abandons par mois : à ce volume, la relance à la main suffit et renseigne
  mieux). Le jour où on le fera :
  - un seul message, envoyé 1 h après l'abandon, jamais de série ;
  - par e-mail via Resend pour commencer (WhatsApp Business demande une vérification
    Meta) ;
  - vérifier le statut de la commande au moment de l'envoi, jamais à la
    programmation : ne jamais écrire à quelqu'un qui vient de payer ;
  - le contenu dépendra de ce qu'on aura appris en contactant les abandons à la main.
