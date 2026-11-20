-- Dépôt d'un StoryPitch accordé par l'administration (20/11/2026, Sarah) :
-- un projet de la liste peut déposer son StoryPitch même sans lecture payée
-- ni adhésion (premier cas : Nadia Aidna, « Les mains de sa mère »).
-- Seule l'administration écrit ; le porteur lit, pour que le bouton paraisse.

create table if not exists public.storypitch_autorises (
  project_id uuid primary key references public.projects(id) on delete cascade,
  accorde_le timestamptz not null default now()
);

alter table public.storypitch_autorises enable row level security;

drop policy if exists "storypitch autorisé : lecture porteur et admin" on public.storypitch_autorises;
create policy "storypitch autorisé : lecture porteur et admin"
  on public.storypitch_autorises for select
  using (
    public.is_admin()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "storypitch autorisé : écriture admin" on public.storypitch_autorises;
create policy "storypitch autorisé : écriture admin"
  on public.storypitch_autorises for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, delete on public.storypitch_autorises to authenticated;

insert into public.storypitch_autorises (project_id)
values ('33854382-56f2-457c-90a8-0fd7ca97dd29')
on conflict do nothing;
