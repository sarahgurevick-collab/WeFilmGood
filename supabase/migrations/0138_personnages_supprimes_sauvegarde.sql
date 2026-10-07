-- Les personnages secondaires sans description que Sarah supprime depuis
-- /admin/portraits (07/10/2026) : la ligne entière est gardée ici avant la
-- suppression, pour pouvoir la remettre en cas d'erreur.
create table if not exists public.personnages_supprimes (
  id           bigserial primary key,
  personnage   jsonb not null,
  supprime_le  timestamptz not null default now()
);

-- Réservé au serveur : aucune règle d'accès.
alter table public.personnages_supprimes enable row level security;

notify pgrst, 'reload schema';
