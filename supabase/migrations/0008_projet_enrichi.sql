-- =====================================================================
-- Fiche projet enrichie : personnages, co-auteurs, fichiers typés.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Personnages imaginés issus des projets de films.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.character_type as enum ('principal', 'secondaire');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.character_age_range as enum ('enfant', 'adolescent', 'adulte', 'senior');
exception when duplicate_object then null;
end $$;

create table if not exists public.characters (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  name           text not null,
  photo_path     text,
  character_type public.character_type,
  gender         text check (gender in ('homme', 'femme', 'autre')),
  age_range      public.character_age_range,
  biography      text,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

create index if not exists characters_project_idx on public.characters (project_id);

alter table public.characters enable row level security;

drop policy if exists "personnages visibles si projet public ou par l'auteur" on public.characters;
create policy "personnages visibles si projet public ou par l'auteur"
  on public.characters for select
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and (p.is_public or p.owner_id = auth.uid())
    )
  );

drop policy if exists "l'auteur gère les personnages de ses projets" on public.characters;
create policy "l'auteur gère les personnages de ses projets"
  on public.characters for all
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));


-- ---------------------------------------------------------------------
-- 2. Co-auteurs d'un projet, invités par email.
-- ---------------------------------------------------------------------
create table if not exists public.project_co_authors (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  profile_id    uuid references public.profiles(id),
  invited_email text not null,
  status        text not null default 'invite' check (status in ('invite', 'accepte', 'refuse')),
  invited_at    timestamptz not null default now(),
  responded_at  timestamptz
);

create index if not exists project_co_authors_project_idx on public.project_co_authors (project_id);

alter table public.project_co_authors enable row level security;

drop policy if exists "co-auteurs visibles par l'auteur du projet et l'invité" on public.project_co_authors;
create policy "co-auteurs visibles par l'auteur du projet et l'invité"
  on public.project_co_authors for select
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "l'auteur gère les co-auteurs de ses projets" on public.project_co_authors;
create policy "l'auteur gère les co-auteurs de ses projets"
  on public.project_co_authors for insert
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

drop policy if exists "l'auteur ou l'invité répond à l'invitation" on public.project_co_authors;
create policy "l'auteur ou l'invité répond à l'invitation"
  on public.project_co_authors for update
  using (
    profile_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );


-- ---------------------------------------------------------------------
-- 3. Typage des fichiers de projet (scénario, vignette, moodboard).
--    On vérifie d'abord qu'aucune ligne existante ne sortirait de cette
--    liste avant de poser la contrainte.
-- ---------------------------------------------------------------------
update public.project_files set kind = 'scenario' where kind not in ('scenario', 'vignette', 'moodboard');

alter table public.project_files drop constraint if exists project_files_kind_check;
alter table public.project_files add constraint project_files_kind_check
  check (kind in ('scenario', 'vignette', 'moodboard'));


-- ---------------------------------------------------------------------
-- 4. Bucket public pour les vignettes de présentation (16/9).
--    Le moodboard (PDF) reste dans le bucket privé "scenarios".
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('project-media', 'project-media', true)
on conflict (id) do nothing;

drop policy if exists "vignettes de projet lisibles par tous" on storage.objects;
create policy "vignettes de projet lisibles par tous"
  on storage.objects for select using (bucket_id = 'project-media');

drop policy if exists "chacun gère les vignettes de ses projets" on storage.objects;
create policy "chacun gère les vignettes de ses projets"
  on storage.objects for insert
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "chacun met à jour les vignettes de ses projets" on storage.objects;
create policy "chacun met à jour les vignettes de ses projets"
  on storage.objects for update
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
