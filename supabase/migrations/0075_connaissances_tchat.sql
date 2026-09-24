-- =====================================================================
-- Ce que sait le tchat : le texte des informations sur le site, que
-- l'administration modifie elle-même depuis /admin/tchat.
--
-- Une seule ligne (id = 1). Les règles de conduite du tchat (ne pas
-- inventer, pas d'avis sur les projets…) restent dans le code
-- (src/lib/assistant/connaissances.ts) : seules les informations se
-- modifient ici. La version précédente est gardée, pour pouvoir revenir
-- en arrière d'un clic après une fausse manœuvre.
-- =====================================================================

create table if not exists public.assistant_connaissances (
  id              integer primary key default 1 check (id = 1),
  texte           text not null,
  texte_precedent text,
  modifie_le      timestamptz not null default now(),
  modifie_par     uuid references public.profiles(id) on delete set null
);

alter table public.assistant_connaissances enable row level security;

drop policy if exists "l'administration lit et modifie ce que sait le tchat" on public.assistant_connaissances;
create policy "l'administration lit et modifie ce que sait le tchat"
  on public.assistant_connaissances
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- Le tchat répond aussi aux visiteurs : il lit le texte par cette
-- fonction, qui ne renvoie que lui. Ce sont des informations publiques
-- sur le fonctionnement du site.
create or replace function public.connaissances_tchat()
returns text
language sql
stable
security definer
set search_path to ''
as $$
  select texte from public.assistant_connaissances where id = 1;
$$;

revoke all on function public.connaissances_tchat() from public;
grant execute on function public.connaissances_tchat() to anon, authenticated;
