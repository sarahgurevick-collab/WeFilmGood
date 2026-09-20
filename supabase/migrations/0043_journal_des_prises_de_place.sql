-- =====================================================================
-- Se connecter à la place d'un membre.
--
-- L'administration fait une grande part du travail des membres :
-- déposer un PDF qu'un auteur n'arrive pas à charger, compléter un
-- biofilmo, corriger une logline. C'était un bouton de WFG 1, utilisé
-- très souvent.
--
-- Tout ce qui est fait dans ce mode est enregistré au nom du membre :
-- rien ne distinguerait l'intervention de l'administration de la sienne.
-- D'où ce journal — la seule façon de répondre plus tard à « qui a écrit
-- ça ? ».
-- =====================================================================

create table if not exists public.admin_impersonations (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  target_id uuid not null references public.profiles(id),
  started_at timestamptz not null default now()
);

create index if not exists admin_impersonations_target_idx
  on public.admin_impersonations (target_id, started_at desc);

alter table public.admin_impersonations enable row level security;

drop policy if exists "journal réservé à l'administration" on public.admin_impersonations;
create policy "journal réservé à l'administration"
  on public.admin_impersonations for select
  using (public.is_admin());

create or replace function public.journaliser_prise_de_place(p_target uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  insert into public.admin_impersonations (admin_id, target_id)
  select auth.uid(), p_target
  where public.is_admin();
$$;

grant execute on function public.journaliser_prise_de_place(uuid) to authenticated;
