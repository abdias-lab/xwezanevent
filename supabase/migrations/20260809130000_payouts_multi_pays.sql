-- Généralise payouts.numero_destination et payouts.moyen au Togo (Flooz /
-- Mixx by Yas) — étape 4 du chantier multi-pays (reversements). La
-- validation fine (format exact par pays, opérateurs proposés) reste
-- entièrement côté appli (voir lib/telephone.ts) ; cette migration ne fait
-- que desserrer les filets de sécurité en base, dans l'esprit déjà posé par
-- 20260718120000_numero_destination_payouts.sql : « cette contrainte CHECK
-- est un filet de sécurité en base, pas la validation principale ».
--
-- numero_destination : la contrainte '^01[0-9]{8}$' n'acceptait QUE le
-- format béninois (10 chiffres, préfixe 01). Le Togo utilise 8 chiffres,
-- sans préfixe fixe (ARCEP Togo : indicatif +228, numéro national à 8
-- chiffres, système fermé — contrairement au Bénin, aucune migration de
-- numérotation n'a jamais eu lieu au Togo, donc pas de tolérance
-- "ancien format à compléter" à prévoir côté appli non plus). Plutôt que
-- d'encoder les deux formats exacts (et leurs préfixes par opérateur) dans
-- une regex SQL à maintenir en synchro avec lib/telephone.ts, on desserre
-- vers une contrainte de forme large : chiffres uniquement, 8 à 10
-- caractères.
--
-- moyen : le Togo a deux opérateurs Mobile Money, aucun des deux n'existant
-- au Bénin — Flooz (Moov Africa Togo) et Mixx by Yas (Yas Togo, ex-Togocom,
-- rebrandé nov. 2024). Codes distincts par pays choisis délibérément
-- (plutôt que de réutiliser 'moov' pour Flooz malgré le même groupe Moov
-- Africa derrière les deux marques) : Abdias traite les virements
-- manuellement et doit reconnaître l'opérateur d'un coup d'œil sur cette
-- seule colonne, sans avoir à croiser avec pays_code à chaque ligne.

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS numero_destination_format;
ALTER TABLE public.payouts
  ADD CONSTRAINT numero_destination_format CHECK (numero_destination ~ '^[0-9]{8,10}$');

ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_moyen_check;
ALTER TABLE public.payouts
  ADD CONSTRAINT payouts_moyen_check CHECK (moyen IN ('mtn', 'moov', 'celtiis', 'flooz', 'yas'));
