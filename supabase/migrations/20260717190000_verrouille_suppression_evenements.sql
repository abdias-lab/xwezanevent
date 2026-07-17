-- Suite de E1 (audit sécurité), signalée dans 20260717180000 : DELETE sur
-- `events` a le même profil que UPDATE. Vérifié : la seule suppression
-- d'événement de l'application est /api/admin/events/[id]/supprimer, qui
-- écrit via `supabaseAdmin` (service_role, hors RLS `authenticated`).
-- Aucun flux organisateur ne supprime un événement (l'annulation, elle,
-- passe par la fonction SECURITY DEFINER annuler_evenement et ne détruit
-- aucune donnée). Les policies DELETE existantes ("Organisateurs can
-- delete their own events", "Admin can delete any event") n'ont donc
-- aucun cas d'usage légitime côté client — même raisonnement que pour
-- INSERT (20260717130000) et UPDATE (20260717180000) : blocage total,
-- cohérent avec orders/tickets/payouts.

DROP POLICY IF EXISTS "Organisateurs can delete their own events" ON events;
DROP POLICY IF EXISTS "Admin can delete any event" ON events;
CREATE POLICY "Block delete events via anon"
  ON events FOR DELETE
  USING (false);
