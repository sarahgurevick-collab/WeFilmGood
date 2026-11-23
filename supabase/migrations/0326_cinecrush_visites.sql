-- =====================================================================
-- Le rappel du CinéCrush (24/11/2026, Sarah) : « un message popup qui
-- rappelle le CinéCrush. Si le talent est allé visiter la page, le popup
-- ne s'affiche plus. »
--
-- On note donc qui a ouvert la page CinéCrush, semaine par semaine : une
-- ligne par membre et par semaine (le dimanche qui ouvre la semaine). Le
-- rappel s'affiche sur les Galaxies tant que la ligne de la semaine en
-- cours n'existe pas ; il revient de lui-même avec le CinéCrush suivant.
-- =====================================================================

create table if not exists public.cinecrush_visites (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  semaine date not null,
  vu_le timestamptz not null default now(),
  primary key (profile_id, semaine)
);

comment on table public.cinecrush_visites is
  'Qui a ouvert la page CinéCrush, par semaine : le rappel en fenêtre des Galaxies ne s''affiche plus ensuite.';

alter table public.cinecrush_visites enable row level security;

-- Chacun lit ses propres visites ; l'écriture passe par le serveur.
drop policy if exists "cinecrush_visites : les siennes" on public.cinecrush_visites;
create policy "cinecrush_visites : les siennes" on public.cinecrush_visites
  for select using (profile_id = auth.uid());

revoke all on public.cinecrush_visites from anon, public;
grant select on public.cinecrush_visites to authenticated;
grant all on public.cinecrush_visites to service_role;
