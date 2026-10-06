-- Les aidants aux portraits (06/10/2026, demande de Sarah) : quelqu'un de
-- confiance qui l'aide à poser des photos sur les personnages sans portrait,
-- sans être administrateur (un administrateur voit tout : emails des membres,
-- identité des lecteurs, factures). Il ne voit que l'écran « Portraits ».
-- On l'ajoute par son adresse email : l'accès marche dès qu'il se connecte.
create table if not exists public.portrait_helpers (
  email    text primary key check (email = lower(email)),
  ajoute_le timestamptz not null default now(),
  note     text
);

-- Réservé au serveur : aucune règle d'accès pour les membres.
alter table public.portrait_helpers enable row level security;

create or replace function public.is_portrait_helper()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
      from public.portrait_helpers h
      join auth.users u on lower(u.email) = h.email
     where u.id = auth.uid()
  );
$$;

revoke all on function public.is_portrait_helper() from public, anon;
grant execute on function public.is_portrait_helper() to authenticated;

notify pgrst, 'reload schema';
