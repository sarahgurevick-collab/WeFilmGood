-- Supprimer un membre depuis l'écran des membres (18/10/2026, Sarah : « je
-- souhaite supprimer ce profil car il ne correspond à rien, je n'ai pas le
-- moyen de le faire »). Chaque suppression est notée ici : la réimportation
-- finale de WFG 1 saute ces comptes, sinon ils reviendraient à la bascule.
create table if not exists public.membres_supprimes (
  id bigint generated always as identity primary key,
  legacy_user_id bigint,
  email text not null,
  nom text,
  motif text,
  supprime_par uuid,
  supprime_le timestamptz not null default now()
);
comment on table public.membres_supprimes is
  'Comptes supprimés par l''administration ; la réimportation de WFG 1 les exclut (legacy_user_id ou email).';
alter table public.membres_supprimes enable row level security;
revoke all on public.membres_supprimes from anon, authenticated;

-- Le premier : un compte producteur de WFG 1 sans nom ni projet.
insert into public.membres_supprimes (legacy_user_id, email, nom, motif)
values (4054, 'maritaux.etxea@gmail.com', null, 'Profil vide (producteur WFG 1 sans nom ni projet), demande de Sarah le 18/10/2026');
