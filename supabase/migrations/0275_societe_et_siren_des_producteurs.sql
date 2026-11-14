-- 14/11/2026, Sarah : « ok pour les 3 points, vas-y ».
-- 1. Le nom de société du producteur, repris de WFG 1, entre dans le profil
--    (profiles.societe) : c'est lui qu'on met en face des producteurs
--    délégués du CNC (« c'est le nom de société qu'on devrait mentionner »).
-- 2. Le numéro de SIREN saisi sur WFG 1 est gardé pour l'administration
--    seulement (table sans aucun droit pour les membres) ; il n'est plus
--    jamais demandé dans un formulaire. Il sert à contrôler que la société
--    existe encore (scripts/controler-societes-siren.mjs).
-- Les données elles-mêmes sont reprises par scripts/reprendre-societes-wfg1.sql,
-- rejouable après la réimportation finale (ne remplit que ce qui est vide).
alter table public.profiles add column if not exists societe text;

create table if not exists public.societes_siren (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  siren text not null check (siren ~ '^[0-9]{9}$'),
  -- Ce que le producteur avait saisi sur WFG 1 (SIREN, ou SIRET à 14 chiffres).
  saisi text,
  -- Résultat du contrôle dans l'annuaire public des entreprises.
  etat text check (etat in ('active', 'fermee', 'introuvable')),
  denomination text,
  fermee_le date,
  controle_le timestamptz,
  cree_le timestamptz not null default now()
);
alter table public.societes_siren enable row level security;
