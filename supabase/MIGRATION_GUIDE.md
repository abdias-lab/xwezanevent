# Migration Supabase - xwezanevent

## 📋 Contenu de la migration

La migration SQL complète `20260706120000_init_schema.sql` contient :

### Tables créées
1. **profiles** - Profils utilisateurs liés à auth.users
2. **events** - Événements avec statut et informations
3. **ticket_types** - Types de tickets par événement
4. **orders** - Commandes de tickets
5. **tickets** - Tickets individuels avec QR code
6. **payouts** - Paiements vers les organisateurs

### Triggers
- **on_auth_user_created** - Crée automatiquement un profil 'visiteur' lors de l'inscription

### Row Level Security (RLS)
- Activé sur TOUTES les tables
- Lectures publiques pour events publiés et leurs ticket_types
- Lectures/écritures privées (chacun sa propre donnée)
- Rôles : visiteur, organisateur, admin
- **Écritures sensibles bloquées via clé anon** (orders, tickets, payouts)

## 🚀 Marche à suivre pour appliquer la migration

### Option 1 : Via le SQL Editor de Supabase (recommandé)

1. **Ouvrir Supabase Dashboard**
   - Allez sur https://app.supabase.com
   - Sélectionnez votre projet `xwezanevent`

2. **Accéder au SQL Editor**
   - Dans le menu de gauche, cliquez sur **SQL Editor**
   - Cliquez sur **New Query** (ou +)

3. **Copier-coller le SQL**
   - Ouvrez le fichier `supabase/migrations/20260706120000_init_schema.sql`
   - Copiez son contenu intégralement
   - Collez-le dans l'éditeur SQL de Supabase
   - Vérifiez qu'il n'y a pas d'erreurs de syntaxe

4. **Exécuter la migration**
   - Cliquez sur le bouton **RUN** (en haut à droite)
   - Attendez la confirmation : ✓ Success
   - Vous devriez voir "X rows affected" ou similaire

5. **Vérifier l'application**
   - Dans le menu **Table Editor**, vous devez voir les 6 nouvelles tables
   - Vérifiez que RLS est activé (icône cadenas sur chaque table)

### Option 2 : Via Supabase CLI (avancé)

Si vous avez Supabase CLI installé :

```bash
# Initialiser le projet Supabase (si non fait)
supabase init

# Lier à votre projet
supabase link --project-ref afrudqwgkxpuwpmdodhx

# Appliquer la migration
supabase migration up
```

### Option 3 : Via le dossier migrations (recommandé pour production)

1. Placez le fichier `20260706120000_init_schema.sql` dans `supabase/migrations/`
2. Chaque commit avec une nouvelle migration est versionnée
3. Supabase CLI appliquera automatiquement les migrations manquantes

## 🔐 Sécurité et permissions

### Lectures publiques autorisées
- Events avec `statut = 'publie'`
- Ticket types associés à ces events
- Profiles (informations publiques)

### Lectures privées (authentifiées)
- Utilisateur : ses propres orders, tickets, profile
- Organisateur : ses événements, et les orders/tickets de ses événements
- Admin : tout (via service_role_key)

### Écritures BLOQUÉES via clé anon
- ❌ Créer/modifier orders
- ❌ Créer/modifier tickets
- ❌ Créer/modifier payouts
- ❌ Modifier ticket_types directement
- ✅ Utiliser des API serveur (Next.js) pour ces opérations

### Écritures AUTORISÉES via clé anon
- ✅ Créer/modifier son propre profile
- ✅ Créer events (si organisateur)
- ✅ Modifier ses propres events

## 📝 Exemple d'utilisation du client

```typescript
// lib/supabase.ts déjà configuré

// Client navigateur (clé anon)
import { supabase } from '@/lib/supabase';

// Lire les events publiés
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('statut', 'publie');

// Client serveur (service_role - CÔTÉ SERVEUR UNIQUEMENT)
import { supabaseAdmin } from '@/lib/supabase';

// Créer une commande (faire côté serveur)
const { data: order } = await supabaseAdmin
  .from('orders')
  .insert({ user_id, event_id, ... });

// Créer des tickets (faire côté serveur)
const { data: tickets } = await supabaseAdmin
  .from('tickets')
  .insert([...]);
```

## ✅ Checklist post-migration

- [ ] Toutes les tables sont créées (6 au total)
- [ ] RLS est activé sur chaque table
- [ ] Les indexes sont créés
- [ ] Le trigger `on_auth_user_created` existe
- [ ] Les policies (politiques) sont en place
- [ ] Test : créer un utilisateur → vérifier qu'un profile est auto-créé
- [ ] Test : tenter de créer une commande via anon key → doit échouer
- [ ] Test : créer une commande via service_role → doit fonctionner

## 🐛 Troubleshooting

### "permission denied for schema public"
- Vérifiez que vous êtes connecté avec un rôle admin ou le service role
- Dans Supabase, utilisez le SQL Editor avec un compte autorisé

### RLS bloque tout
- Vérifiez que vous êtes authentifié si vous essayez de lire vos données privées
- Pour tester, utilisez l'onglet **Auth** de Supabase pour créer un utilisateur test

### Trigger ne fonctionne pas
- Vérifiez que `auth.users` existe (Supabase le crée automatiquement)
- Testez l'inscripción d'un nouvel utilisateur et vérifiez le table `profiles`

## 📚 Documentation
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Supabase Integration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs-app-router)
