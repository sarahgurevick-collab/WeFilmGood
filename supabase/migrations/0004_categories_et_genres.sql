-- =====================================================================
-- Catégorisation des profils (A/P/T) et référentiel des genres.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Catégorie du profil : Auteur / Producteur / Autres Talents
--    Distincte des "métiers" (public.roles) qui restent des champs de
--    compétence complémentaires.
-- ---------------------------------------------------------------------
do $$ begin
  create type public.profile_category as enum ('auteur', 'producteur', 'talent');
exception when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists category public.profile_category;


-- ---------------------------------------------------------------------
-- 2. Identifiants hérités, pour un futur import idempotent depuis
--    l'ancienne base wefilmgood.com.
-- ---------------------------------------------------------------------
alter table public.profiles     add column if not exists legacy_id text unique;
alter table public.projects     add column if not exists legacy_id text unique;
alter table public.project_files add column if not exists legacy_id text unique;


-- ---------------------------------------------------------------------
-- 3. Genres — référentiel unique (10 valeurs), réutilisé à la fois par
--    les projets et par les préférences de genre des profils.
-- ---------------------------------------------------------------------
create table if not exists public.genres (
  slug     text primary key,
  label_fr text not null,
  label_en text not null,
  position int  not null default 0
);

insert into public.genres (slug, label_fr, label_en, position) values
  ('drame',                     'Drame',                                 'Drama',                    1),
  ('comedie',                   'Comédie',                               'Comedy',                   2),
  ('horreur_scifi_fantastique', 'Horreur / Science-Fiction / Fantastique', 'Horror / Sci-Fi / Fantasy', 3),
  ('thriller_policier',         'Thriller & Policier',                   'Thriller & Crime',         4),
  ('aventure',                  'Aventure',                              'Adventure',                5),
  ('histoire_guerre',           'Histoire & Guerre',                     'History & War',            6),
  ('biopic',                    'Biopic',                                'Biopic',                   7),
  ('animation',                 'Animation',                             'Animation',                8),
  ('documentaire',              'Documentaire',                          'Documentary',              9),
  ('films_musicaux',            'Films musicaux',                        'Musical films',           10)
on conflict (slug) do nothing;

alter table public.genres enable row level security;

drop policy if exists "genres lisibles par tous" on public.genres;
create policy "genres lisibles par tous"
  on public.genres for select using (true);


-- ---------------------------------------------------------------------
-- 4. Rattachement des projets au référentiel de genres.
--    L'ancienne colonne texte libre est conservée sous un autre nom
--    le temps de migrer l'UI (suppression différée à une migration
--    ultérieure), et sert de source pour un rattachement best-effort.
-- ---------------------------------------------------------------------
alter table public.projects rename column genre to genre_legacy;
alter table public.projects add column if not exists genre_slug text references public.genres(slug);

update public.projects p
set genre_slug = g.slug
from public.genres g
where p.genre_slug is null
  and p.genre_legacy is not null
  and lower(regexp_replace(p.genre_legacy, '[^a-zA-Z]+', '_', 'g')) = g.slug;

create index if not exists projects_genre_idx on public.projects (genre_slug);


-- ---------------------------------------------------------------------
-- 5. Genres préférés d'un profil (mot-clé de recherche <CM+>).
-- ---------------------------------------------------------------------
create table if not exists public.profile_genres (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  genre_slug text not null references public.genres(slug)  on delete cascade,
  primary key (profile_id, genre_slug)
);

alter table public.profile_genres enable row level security;

drop policy if exists "genres de profil lisibles par tous" on public.profile_genres;
create policy "genres de profil lisibles par tous"
  on public.profile_genres for select using (true);

drop policy if exists "chacun gère ses genres préférés" on public.profile_genres;
create policy "chacun gère ses genres préférés"
  on public.profile_genres for all
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);


-- ---------------------------------------------------------------------
-- 6. Format immersif (360/VR), ajouté à l'enum existant.
--    Statement isolé : Postgres interdit d'utiliser une valeur d'enum
--    fraîchement ajoutée dans la même transaction.
-- ---------------------------------------------------------------------
alter type public.project_format add value if not exists 'immersif_360_vr';


-- ---------------------------------------------------------------------
-- 7. Champs complémentaires de la fiche projet (onglet PROJET).
-- ---------------------------------------------------------------------
do $$ begin
  create type public.project_progress_stage as enum (
    'roman_nouvelle',
    'synopsis_court',
    'traitement',
    'premiere_version',
    'deuxieme_version_ou_plus'
  );
exception when duplicate_object then null;
end $$;

alter table public.projects add column if not exists progress_stage public.project_progress_stage;
alter table public.projects add column if not exists trailer_url text;
alter table public.projects add column if not exists has_awards boolean not null default false;
alter table public.projects add column if not exists awards_detail text;
alter table public.projects add column if not exists budget_range text;
alter table public.projects add column if not exists target_audience text[];
