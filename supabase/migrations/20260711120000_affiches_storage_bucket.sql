-- Bucket Storage "affiches" : lecture publique (URLs publiques des affiches
-- d'événements), écriture réservée aux utilisateurs authentifiés.
-- Le bucket lui-même a déjà été créé via l'API Storage (public, limite
-- 5 Mo, types jpeg/png/webp) ; cet insert est idempotent pour rejouer la
-- migration sur un autre environnement (ex. staging) sans erreur.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'affiches',
  'affiches',
  true,
  5242880, -- 5 Mo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique des objets du bucket (nécessaire pour lister/consulter
-- via l'API Storage ; les URLs publiques directes fonctionnent déjà grâce
-- à `public = true` ci-dessus, indépendamment de cette policy).
create policy "Lecture publique des affiches"
on storage.objects for select
to public
using (bucket_id = 'affiches');

-- Upload réservé aux utilisateurs authentifiés. En pratique, l'app envoie
-- les fichiers via le serveur avec la clé service_role (qui contourne la
-- RLS) : cette policy est un filet de sécurité si l'anon key est utilisée
-- pour un upload direct depuis le navigateur.
create policy "Upload des affiches par les utilisateurs authentifiés"
on storage.objects for insert
to authenticated
with check (bucket_id = 'affiches');
