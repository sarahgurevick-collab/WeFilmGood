-- Archives des fiches de lecture reliées au profil de leur auteur
-- (27/11/2026, Sarah : « relie-les »). Une archive dont le projet n'est pas
-- sur WFG 2 ne se rattachait à rien ; quand son auteur a un profil (même
-- prénom et nom, un seul profil, jamais un compte lecteur), elle est reliée
-- à ce profil. Mémo pour l'administration UNIQUEMENT, comme les archives :
-- l'auteur ne voit rien. Une fiche peut avoir plusieurs auteurs.

create table if not exists public.archives_lecture_auteurs (
  archive_id uuid not null references public.archives_fiches_lecture(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  -- Comment l'auteur a été retrouvé (« même nom », « à la main »).
  rattachement text,
  relie_le timestamptz not null default now(),
  primary key (archive_id, profile_id)
);
create index if not exists archives_lecture_auteurs_profil on public.archives_lecture_auteurs (profile_id);

alter table public.archives_lecture_auteurs enable row level security;
revoke all on public.archives_lecture_auteurs from anon, authenticated;
create policy "archives_lecture_auteurs : administration" on public.archives_lecture_auteurs
  for all using (public.is_admin()) with check (public.is_admin());
