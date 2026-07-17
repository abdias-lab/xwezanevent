-- Suite de C1 (audit sécurité). Vérification faite : aucun flux client
-- n'insère dans `events` (lib/supabase-browser.ts sert uniquement à
-- l'auth — connexion/reset/déconnexion — jamais à des écritures de
-- données), et `/creer` (app/(orga)/creer/actions.ts) écrit exclusivement
-- via `supabaseAdmin` (service_role), qui bypass RLS. La policy INSERT
-- "au cas où" (statut/mis_en_avant restreints) n'a donc aucun cas d'usage
-- légitime : on la remplace par un blocage total, cohérent avec le
-- pattern déjà en place sur orders/tickets/payouts ("Block insert ...
-- via anon", WITH CHECK (false)).
--
-- Le trigger prevent_unauthorized_event_insert (migration précédente)
-- reste en place sans modification : défense en profondeur si une policy
-- future était rouverte par erreur.

DROP POLICY IF EXISTS "Organisateurs can insert events" ON events;
CREATE POLICY "Block insert events via anon"
  ON events FOR INSERT
  WITH CHECK (false);
