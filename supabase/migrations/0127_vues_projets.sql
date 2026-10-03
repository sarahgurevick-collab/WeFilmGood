-- =====================================================================
-- Les vues d'un projet (03/10/2026, Sarah).
--
-- Sur WFG 1, une vue ne comptait qu'une fois le videopitch regardé jusqu'au
-- bout : les auteurs avaient peu de vues, donc peu de raisons d'être
-- contents. Sur WFG 2, une vue est une fiche ouverte par un membre
-- connecté, une fois par membre et par projet. Les membres de l'équipe
-- comptent (trois ou quatre personnes au plus) ; sont exclus l'auteur,
-- l'administration et les lecteurs.
--
-- Chaque première vue est datée : c'est aussi la preuve de présentation
-- (qui a vu quel projet, et quand). Le repère « déjà ouvert » des cartes
-- s'appuie sur la même table, côté compte, donc sur tous les appareils.
-- =====================================================================

create table if not exists public.project_views (
  project_id      uuid not null references public.projects(id) on delete cascade,
  viewer_id       uuid not null references public.profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  primary key (project_id, viewer_id)
);

create index if not exists project_views_viewer_idx on public.project_views (viewer_id);

alter table public.project_views enable row level security;

-- Chacun ne voit que ses propres vues (pour le repère « déjà ouvert »).
-- Personne n'écrit en direct : seule la fonction ci-dessous le fait.
drop policy if exists "chacun voit ses propres vues" on public.project_views;
create policy "chacun voit ses propres vues"
  on public.project_views for select
  using (viewer_id = auth.uid());


create or replace function public.enregistrer_vue(p_projet uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  -- Ni l'auteur, ni l'administration, ni un lecteur.
  if exists (select 1 from public.projects where id = p_projet and owner_id = auth.uid())
     or public.is_admin()
     or exists (select 1 from public.profile_roles where profile_id = auth.uid() and role_slug = 'lecteur') then
    return;
  end if;
  if not exists (select 1 from public.projects where id = p_projet) then
    return;
  end if;

  insert into public.project_views (project_id, viewer_id)
  values (p_projet, auth.uid())
  on conflict (project_id, viewer_id) do update set last_viewed_at = now();
end;
$$;

grant execute on function public.enregistrer_vue(uuid) to authenticated;


-- Le nombre de vues : à l'auteur du projet et à l'administration seulement.
create or replace function public.compter_vues(p_projet uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.projects where id = p_projet and owner_id = auth.uid())
         or public.is_admin()
    then (select count(*)::int from public.project_views where project_id = p_projet)
    else null
  end;
$$;

grant execute on function public.compter_vues(uuid) to authenticated;
