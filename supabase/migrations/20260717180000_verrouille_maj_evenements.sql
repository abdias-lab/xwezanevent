-- Corrige E1 (audit sécurité) : les policies UPDATE sur `events`
-- ("Organisateurs can update their own events", "Admin can update any
-- event") ne restreignaient aucune colonne. Le trigger
-- prevent_unauthorized_status_change protège `statut`, mais rien ne
-- protégeait `titre`, `description`, `affiche_url`, `mis_en_avant`,
-- `ordre_affiche`, etc. Un organisateur pouvait, via un PATCH REST direct
-- (clé anon + JWT), modifier le contenu d'un événement déjà validé sans
-- repasser par la modération, voire s'auto-mettre en avant
-- (mis_en_avant/ordre_affiche, normalement réservés à l'admin via
-- /api/admin/events/[id]/mettre-en-avant).
--
-- Vérification faite (même raisonnement que C1) : AUCUNE route de
-- l'application n'écrit sur `events` via le rôle Postgres `authenticated`
-- (le client de session). Toutes les écritures passent par
-- `supabaseAdmin` (service_role — valider, refuser, mettre-en-avant,
-- supprimer) ou par la fonction SECURITY DEFINER `annuler_evenement`
-- (exécutée en tant que propriétaire de la fonction, hors RLS
-- `authenticated`) — ni l'une ni l'autre voie n'est affectée par ce
-- blocage. Il n'existe aujourd'hui aucun flux d'édition d'événement côté
-- organisateur (app/(orga)/ ne contient que la création). Blocage total,
-- cohérent avec le pattern déjà en place sur orders/tickets/payouts et
-- avec le blocage INSERT posé sur events (20260717130000), plutôt qu'une
-- restriction fine par colonne qui n'aurait aucun cas d'usage légitime.
--
-- Le trigger prevent_unauthorized_status_change reste en place sans
-- modification : défense en profondeur si une policy future rouvrait
-- l'UPDATE par erreur.
--
-- Note : DELETE sur `events` a le même profil (uniquement supprimer/route.ts,
-- via supabaseAdmin) mais n'est pas traité ici — hors périmètre de E1,
-- signalé pour un futur durcissement si besoin.

DROP POLICY IF EXISTS "Organisateurs can update their own events" ON events;
DROP POLICY IF EXISTS "Admin can update any event" ON events;
CREATE POLICY "Block update events via anon"
  ON events FOR UPDATE
  USING (false);
