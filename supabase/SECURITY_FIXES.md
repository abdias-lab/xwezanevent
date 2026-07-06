# Migration Corrective Supabase - Fixes de Sécurité

## 📋 Résumé des corrections

Cette migration corrige 4 failles de sécurité identifiées dans le schéma initial :

### 1. **ESCALADE DE RÔLE** ✅
**Problème** : La policy permettait à un utilisateur de modifier sa propre colonne `role`, ce qui pourrait permettre une escalade vers 'admin'.

**Solution** :
- Trigger `prevent_role_escalation()` bloque les changements de `role` sauf pour `service_role` et `postgres`
- Même pour `auth.uid() = id`, le changement de rôle est rejeté
- Seul l'administrateur (via service_role) peut modifier les rôles

### 2. **AUTO-PUBLICATION** ✅
**Problème** : La policy d'update sur `events` permettait à l'organisateur de changer le statut arbitrairement (passer de 'brouillon' à 'publie' sans validation).

**Solution** :
- Trigger `prevent_unauthorized_status_change()` valide chaque transition
- **Organisateurs autorisés** : `brouillon → en_validation` uniquement
- **Transitions bloquées** : `en_validation → publie`, `en_validation → refuse`, `en_validation → termine`
- **Service_role uniquement** : Peut faire toutes les transitions (validation, publication, refus, clôture)

**Transitions autorisées** :
```
Organisateur:     brouillon → en_validation (demande validation)
Admin/Service:    en_validation → publie (approuve)
Admin/Service:    en_validation → refuse (rejette)
Admin/Service:    publie/brouillon → termine (clôt)
```

### 3. **VIE PRIVÉE** ✅
**Problème** : Tous les visiteurs pouvaient lire le `telephone` de tous les profils via le SELECT public.

**Solution** :
- Column-level SELECT privileges via `GRANT SELECT (colonnes)`
- **Public/Anon** : Peut lire `id, nom, role, created_at` uniquement
- **Authenticated** : Peut lire les colonnes publiques + `telephone, updated_at`
- **Authenticated sur son propre profil** : Accès complet via policy RLS
- **Service_role** : Accès complet

### 4. **UPDATED_AT AUTOMATIQUE** ✅
**Problème** : Pas d'auto-mise à jour de `updated_at` lors des modifications.

**Solution** :
- Fonction `update_updated_at_column()` générique
- Trigger appliqué à TOUTES les tables : profiles, events, ticket_types, orders, tickets, payouts
- La colonne `updated_at` se met à jour automatiquement à `NOW()` lors de chaque UPDATE

### 5. **BONUS : INCLUSION 'TERMINE'** ✅
- Events avec statut `'termine'` sont maintenant lisibles publiquement (comme les 'publie')

## 🚀 Marche à suivre pour appliquer

### Via Supabase SQL Editor (recommandé)

1. **Ouvrir Supabase Dashboard** → Projet xwezanevent
2. **SQL Editor** → New Query
3. **Copier-coller** le contenu complet de `supabase/migrations/20260706130000_security_fixes.sql`
4. **RUN** et attendre ✓ Success
5. **Vérifier** :
   - Les triggers sont créés dans `Database` → `Triggers`
   - Les policies sont mises à jour dans `Database` → `Policies`

### Important ⚠️

Cette migration :
- ✅ Peut être appliquée **AVANT** la migration initiale (drops/créations idempotentes)
- ✅ Peut être appliquée **APRÈS** la migration initiale (remplace les triggers/policies)
- ✅ Est complètement rétrocompatible (aucune modification de schéma)

## 🔐 Modèle de sécurité après corrections

### Escalade de rôle : BLOQUÉE
```typescript
// ❌ Impossible même authentifié
await supabase
  .from('profiles')
  .update({ role: 'admin' })
  .eq('id', userId);
// ERROR: Unauthorized: role can only be changed by administrators
```

### Auto-publication : RESTREINTE
```typescript
// ✅ Organisateur peut demander validation
await supabase
  .from('events')
  .update({ statut: 'en_validation' })
  .eq('id', eventId)
  .eq('organisateur_id', userId);
// SUCCESS (brouillon → en_validation)

// ❌ Organisateur CANNOT publier directement
await supabase
  .from('events')
  .update({ statut: 'publie' })
  .eq('id', eventId);
// ERROR: Unauthorized: only brouillon→en_validation allowed

// ✅ Admin PEUT publier via service_role (côté serveur)
await supabaseAdmin
  .from('events')
  .update({ statut: 'publie' })
  .eq('id', eventId);
// SUCCESS (via service_role uniquement)
```

### Vie privée : PROTÉGÉE
```typescript
// ❌ Public ne voit PAS le telephone
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', someUserId);
// Retourne: { id, nom, role, created_at } - telephone manquant

// ✅ Utilisateur voit son propre telephone
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', auth.uid());
// Retourne: { id, nom, role, created_at, telephone, updated_at }
```

### Updated_at : AUTOMATIQUE
```typescript
// ✅ Updated_at se met à jour seul
await supabase
  .from('events')
  .update({ titre: 'Nouveau titre' })
  .eq('id', eventId);
// updated_at = NOW() (automatique)
```

## 🐛 Troubleshooting

### "permission denied for schema public"
- Assurez-vous que vous êtes authentifié avec un compte autorisé
- Utilisez le SQL Editor depuis le Dashboard (pas un client externe)

### Trigger ne se déclenche pas
- Vérifiez que les triggers existent : `Database` → `Triggers`
- Vérifiez qu'aucune colonne ne manque du UPDATE

### Column privileges ne s'appliquent pas
- Les privileges de colonne peuvent prendre quelques secondes à s'appliquer
- Refrais la connexion Supabase (reconnectez-vous)
- Vérifiez avec : `GRANT` dans un nouveau query

## 📊 Vérification post-migration

Exécutez ces queries pour vérifier :

```sql
-- 1. Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
-- Doit afficher: validate_profile_update_trigger, prevent_event_status_change, 
--               update_*_updated_at (6 triggers)

-- 2. Vérifier les policies
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Doit afficher les policies mises à jour

-- 3. Vérifier les column privileges
SELECT grantee, privilege_type, is_grantable
FROM table_privilege_view
WHERE table_name = 'profiles';
```

## 📝 Prochaines étapes

1. ✅ Appliquer cette migration dans Supabase SQL Editor
2. ✅ Tester les transitions d'événements (brouillon → en_validation)
3. ✅ Tester que les profiles ne montrent pas le telephone en public
4. ✅ Vérifier que updated_at se met à jour automatiquement
5. ✅ Créer un endpoint serveur `/api/events/validate` pour approuver les événements (service_role)
6. ✅ Créer un endpoint serveur `/api/events/publish` pour publier (admin)
