-- Commission par défaut variable par pays, plutôt qu'une constante globale à
-- 8% (voir 20260728140000_commission_par_defaut_8_pourcent.sql). Nécessaire
-- avant l'ouverture commerciale du Togo : rien ne garantit que le taux
-- optimal y sera identique à celui du Bénin (coûts Mobile Money locaux
-- différents), mais le chiffre exact n'est pas encore arbitré — voir
-- échange avec Abdias du 2026-08-09.
--
-- N'affecte que la valeur utilisée à la CRÉATION d'un événement (étape
-- suivante : app/(orga)/creer/actions.ts lit cette colonne au lieu de
-- compter sur le DEFAULT de events.taux_commission). Aucun effet rétroactif
-- sur les événements existants ni sur les accords commerciaux déjà fixés
-- au niveau événement (ex. Jospin à 0%, voir
-- 20260726130000_taux_commission_par_evenement.sql).
--
-- Pas de policy RLS à ajouter : la table `pays` bloque déjà toute écriture
-- anon/authenticated au niveau ligne (USING (false) / WITH CHECK (false),
-- voir 20260805120000_multi_pays_evenements.sql) — ça couvre aussi cette
-- nouvelle colonne. Seul service_role (Abdias, SQL Editor) pourra la
-- modifier.

ALTER TABLE public.pays
  ADD COLUMN IF NOT EXISTS taux_commission_defaut NUMERIC(4,3) NOT NULL DEFAULT 0.08
  CHECK (taux_commission_defaut >= 0 AND taux_commission_defaut <= 1);

-- Bénin : valeur actuelle inchangée. Togo : même valeur que le Bénin pour
-- l'instant (provisoire — à ajuster ici en base une fois les calculs de
-- coûts faits, avant l'ouverture commerciale du Togo).
UPDATE public.pays SET taux_commission_defaut = 0.08 WHERE code = 'bj';
UPDATE public.pays SET taux_commission_defaut = 0.08 WHERE code = 'tg';
