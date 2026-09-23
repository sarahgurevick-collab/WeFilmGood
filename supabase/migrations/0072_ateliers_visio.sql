-- =====================================================================
-- Ateliers en visio (Jitsi, sur meet.wefilmgood.com).
--
-- Un atelier = une salle Jitsi. Jusqu'à 5 intervenants reçoivent par
-- email un lien personnel (clé secrète) qui les fait entrer avec micro
-- et caméra. Le public, réservé aux membres connectés, regarde sans
-- parler et pose ses questions par écrit ; l'administratrice les voit
-- arriver en régie et les relaie à l'oral. L'enregistrement devient la
-- rediffusion, envoyée par email aux présents.
-- =====================================================================

create table if not exists public.ateliers (
  id                     uuid primary key default gen_random_uuid(),
  titre                  text not null,
  description            text,
  debut                  timestamptz not null,
  duree_minutes          integer not null default 90 check (duree_minutes between 15 and 480),
  salle                  text not null unique check (salle ~ '^[a-z0-9-]{3,60}$'),
  rediffusion_fichier    text,
  rediffusion_envoyee_le timestamptz,
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now()
);

create table if not exists public.atelier_intervenants (
  id          uuid primary key default gen_random_uuid(),
  atelier_id  uuid not null references public.ateliers(id) on delete cascade,
  nom         text not null,
  email       text not null,
  cle         text not null unique default encode(extensions.gen_random_bytes(18), 'hex'),
  invite_le   timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.atelier_questions (
  id          uuid primary key default gen_random_uuid(),
  atelier_id  uuid not null references public.ateliers(id) on delete cascade,
  auteur_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  texte       text not null check (char_length(texte) between 1 and 1000),
  statut      text not null default 'nouvelle' check (statut in ('nouvelle', 'relayee', 'ecartee')),
  created_at  timestamptz not null default now()
);
create index if not exists atelier_questions_atelier_idx on public.atelier_questions (atelier_id, created_at);

-- Qui est venu regarder : ce sont eux qui reçoivent la rediffusion.
create table if not exists public.atelier_presences (
  atelier_id  uuid not null references public.ateliers(id) on delete cascade,
  profile_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  venu_le     timestamptz not null default now(),
  primary key (atelier_id, profile_id)
);

alter table public.ateliers             enable row level security;
alter table public.atelier_intervenants enable row level security;
alter table public.atelier_questions    enable row level security;
alter table public.atelier_presences    enable row level security;

-- Les ateliers : visibles des membres connectés, gérés par l'admin.
drop policy if exists "un membre voit les ateliers" on public.ateliers;
create policy "un membre voit les ateliers"
  on public.ateliers for select to authenticated using (true);
drop policy if exists "un admin gère les ateliers" on public.ateliers;
create policy "un admin gère les ateliers"
  on public.ateliers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Les intervenants (et leur clé secrète) : l'admin seulement.
drop policy if exists "un admin gère les intervenants" on public.atelier_intervenants;
create policy "un admin gère les intervenants"
  on public.atelier_intervenants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Les questions : chacun écrit et relit les siennes ; l'admin voit tout
-- et change leur statut.
drop policy if exists "un membre pose une question" on public.atelier_questions;
create policy "un membre pose une question"
  on public.atelier_questions for insert to authenticated
  with check (auteur_id = auth.uid());
drop policy if exists "un membre relit ses questions" on public.atelier_questions;
create policy "un membre relit ses questions"
  on public.atelier_questions for select to authenticated
  using (auteur_id = auth.uid() or public.is_admin());
drop policy if exists "un admin traite les questions" on public.atelier_questions;
create policy "un admin traite les questions"
  on public.atelier_questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Les présences : chacun note la sienne ; l'admin les lit.
drop policy if exists "un membre note sa présence" on public.atelier_presences;
create policy "un membre note sa présence"
  on public.atelier_presences for insert to authenticated
  with check (profile_id = auth.uid());
drop policy if exists "un admin voit les présences" on public.atelier_presences;
create policy "un admin voit les présences"
  on public.atelier_presences for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
