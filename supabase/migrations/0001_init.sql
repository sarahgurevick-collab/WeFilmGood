-- =====================================================================
-- WeFilmGood — schéma initial
-- À coller dans Supabase Dashboard → SQL Editor → New query → Run
-- Le script est rejouable : le relancer ne casse rien.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Métiers (les rôles du formulaire « Je crée mon profil en tant que »)
-- ---------------------------------------------------------------------
create table if not exists public.roles (
  slug     text primary key,
  label_fr text not null,
  label_en text not null,
  position int  not null default 0
);

insert into public.roles (slug, label_fr, label_en, position) values
  ('scenariste',      'Scénariste',            'Screenwriter',      1),
  ('auteur_bd',       'Auteur de BD',          'Comics author',     2),
  ('romancier',       'Romancier',             'Novelist',          3),
  ('auteur_theatre',  'Auteur de Théâtre',     'Playwright',        4),
  ('producteur',      'Producteur',            'Producer',          5),
  ('realisateur',     'Réalisateur',           'Director',          6),
  ('compositeur',     'Compositeur',           'Composer',          7),
  ('comedien',        'Comédien',              'Actor',             8),
  ('sound_designer',  'Sound designer',        'Sound designer',    9),
  ('monteur',         'Monteur',               'Editor',           10),
  ('directeur_photo', 'Directeur photo',       'Cinematographer',  11),
  ('chef_decorateur', 'Chef décorateur',       'Production designer', 12),
  ('sfx_digitaux',    'Créateur SFX digitaux', 'Digital SFX artist', 13),
  ('animateur_2d_3d', 'Animateur 2D/3D',       '2D/3D animator',   14)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------
-- 2. Profils — une ligne par compte, créée automatiquement à l'inscription
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  display_name text,
  bio          text,
  country      text,
  city         text,
  website      text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.profile_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_slug  text not null references public.roles(slug)  on delete cascade,
  primary key (profile_id, role_slug)
);


-- ---------------------------------------------------------------------
-- 3. Mots-clés — la base de recherche projets / talents
-- ---------------------------------------------------------------------
create table if not exists public.keywords (
  id       bigint generated always as identity primary key,
  slug     text unique not null,
  label_fr text not null,
  label_en text
);


-- ---------------------------------------------------------------------
-- 4. Projets
-- ---------------------------------------------------------------------
do $$ begin
  create type public.project_format as enum
    ('long_metrage', 'court_metrage', 'serie', 'documentaire', 'animation');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.project_status as enum
    ('brouillon', 'depose', 'en_lecture', 'labellise', 'refuse');
exception when duplicate_object then null;
end $$;

create table if not exists public.projects (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  logline    text,
  synopsis   text,
  format     public.project_format,
  genre      text,
  language   text,
  country    text,
  status     public.project_status not null default 'brouillon',
  is_public  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_idx  on public.projects (owner_id);
create index if not exists projects_status_idx on public.projects (status);

create table if not exists public.project_keywords (
  project_id uuid   not null references public.projects(id) on delete cascade,
  keyword_id bigint not null references public.keywords(id) on delete cascade,
  primary key (project_id, keyword_id)
);

create table if not exists public.profile_keywords (
  profile_id uuid   not null references public.profiles(id) on delete cascade,
  keyword_id bigint not null references public.keywords(id) on delete cascade,
  primary key (profile_id, keyword_id)
);

-- Fichiers déposés (scénarios PDF, notes d'intention…) rangés dans Storage.
-- Convention de chemin : scenarios/<user_id>/<nom de fichier>
create table if not exists public.project_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  storage_path  text not null,
  kind          text not null default 'scenario',
  original_name text,
  uploaded_at   timestamptz not null default now()
);

create index if not exists project_files_project_idx on public.project_files (project_id);


-- ---------------------------------------------------------------------
-- 5. Pitchs vidéo — alimentent le collage de la page d'accueil
-- ---------------------------------------------------------------------
create table if not exists public.pitches (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects(id) on delete cascade,
  vimeo_id         text,
  title            text,
  duration_seconds int,
  position         int not null default 0,
  is_featured      boolean not null default false,
  created_at       timestamptz not null default now()
);

create index if not exists pitches_featured_idx on public.pitches (is_featured, position);


-- ---------------------------------------------------------------------
-- 6. Création automatique du profil à l'inscription
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------------------------------------------------------------------
-- 7. Row Level Security
--    Sans ces règles, la clé anon donnerait accès à tout : elles sont
--    la seule chose qui protège les données côté navigateur.
-- ---------------------------------------------------------------------
alter table public.roles            enable row level security;
alter table public.keywords         enable row level security;
alter table public.profiles         enable row level security;
alter table public.profile_roles    enable row level security;
alter table public.profile_keywords enable row level security;
alter table public.projects         enable row level security;
alter table public.project_keywords enable row level security;
alter table public.project_files    enable row level security;
alter table public.pitches          enable row level security;

-- Référentiels : lecture ouverte à tous
drop policy if exists "roles lisibles par tous" on public.roles;
create policy "roles lisibles par tous"
  on public.roles for select using (true);

drop policy if exists "mots-clés lisibles par tous" on public.keywords;
create policy "mots-clés lisibles par tous"
  on public.keywords for select using (true);

-- Profils : annuaire public, chacun ne modifie que le sien
drop policy if exists "profils lisibles par tous" on public.profiles;
create policy "profils lisibles par tous"
  on public.profiles for select using (true);

drop policy if exists "chacun crée son profil" on public.profiles;
create policy "chacun crée son profil"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "chacun modifie son profil" on public.profiles;
create policy "chacun modifie son profil"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Métiers rattachés à un profil
drop policy if exists "métiers lisibles par tous" on public.profile_roles;
create policy "métiers lisibles par tous"
  on public.profile_roles for select using (true);

drop policy if exists "chacun gère ses métiers" on public.profile_roles;
create policy "chacun gère ses métiers"
  on public.profile_roles for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "mots-clés de profil lisibles par tous" on public.profile_keywords;
create policy "mots-clés de profil lisibles par tous"
  on public.profile_keywords for select using (true);

drop policy if exists "chacun gère ses mots-clés" on public.profile_keywords;
create policy "chacun gère ses mots-clés"
  on public.profile_keywords for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

-- Projets : visibles s'ils sont publics, sinon réservés à leur auteur
drop policy if exists "projets publics lisibles" on public.projects;
create policy "projets publics lisibles"
  on public.projects for select
  using (is_public or auth.uid() = owner_id);

drop policy if exists "chacun dépose ses projets" on public.projects;
create policy "chacun dépose ses projets"
  on public.projects for insert with check (auth.uid() = owner_id);

drop policy if exists "chacun modifie ses projets" on public.projects;
create policy "chacun modifie ses projets"
  on public.projects for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "chacun supprime ses projets" on public.projects;
create policy "chacun supprime ses projets"
  on public.projects for delete using (auth.uid() = owner_id);

drop policy if exists "mots-clés de projet lisibles" on public.project_keywords;
create policy "mots-clés de projet lisibles"
  on public.project_keywords for select using (true);

drop policy if exists "chacun gère les mots-clés de ses projets" on public.project_keywords;
create policy "chacun gère les mots-clés de ses projets"
  on public.project_keywords for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ));

-- Fichiers : strictement privés, seul l'auteur du projet y accède
drop policy if exists "fichiers réservés à l'auteur" on public.project_files;
create policy "fichiers réservés à l'auteur"
  on public.project_files for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ));

-- Pitchs : ceux mis en avant sont publics (page d'accueil)
drop policy if exists "pitchs mis en avant lisibles" on public.pitches;
create policy "pitchs mis en avant lisibles"
  on public.pitches for select
  using (
    is_featured
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    )
  );

drop policy if exists "chacun gère les pitchs de ses projets" on public.pitches;
create policy "chacun gère les pitchs de ses projets"
  on public.pitches for all
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = auth.uid()
  ));


-- ---------------------------------------------------------------------
-- 8. Stockage des fichiers
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('scenarios', 'scenarios', false),
  ('avatars',   'avatars',   true)
on conflict (id) do nothing;

-- Scénarios : chaque utilisateur n'accède qu'à son propre dossier
drop policy if exists "scénarios privés par utilisateur" on storage.objects;
create policy "scénarios privés par utilisateur"
  on storage.objects for all
  using (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'scenarios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars lisibles par tous" on storage.objects;
create policy "avatars lisibles par tous"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "chacun gère son avatar" on storage.objects;
create policy "chacun gère son avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
