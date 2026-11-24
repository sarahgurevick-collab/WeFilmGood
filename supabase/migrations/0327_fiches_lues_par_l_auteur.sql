-- =====================================================================
-- Le rappel « Notez cette analyse » seulement après lecture (24/11/2026,
-- Sarah) : « ne s'affiche pas tant que l'auteur n'a pas lu son analyse.
-- S'il ne donne pas de note et qu'il la ferme, il aura ensuite le mémo. »
--
-- On note donc quand l'auteur a ouvert la page de ses analyses : une
-- ligne par fiche publiée. Le rappel (fiches_a_noter) ne compte plus que
-- les fiches déjà ouvertes et pas encore notées.
-- =====================================================================

create table if not exists public.reading_report_lectures (
  reading_report_id uuid primary key references public.reading_reports(id) on delete cascade,
  lue_le timestamptz not null default now()
);

comment on table public.reading_report_lectures is
  'Quand l''auteur a ouvert son analyse pour la première fois : le rappel de notation ne s''affiche qu''ensuite.';

alter table public.reading_report_lectures enable row level security;
revoke all on public.reading_report_lectures from anon, public, authenticated;
grant all on public.reading_report_lectures to service_role;

-- L'auteur ouvre la page des analyses de son projet : ses fiches publiées
-- sont notées comme lues. Sans effet pour tout autre que l'auteur.
create or replace function public.marquer_fiches_lues(p_project_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.reading_report_lectures (reading_report_id)
  select r.id
  from public.reading_report_publications pub
  join public.reading_reports r on r.id = pub.reading_report_id
  join public.projects pr on pr.id = r.project_id
  where r.project_id = p_project_id
    and r.status = 'validee_admin'
    and pr.owner_id = auth.uid()
  on conflict do nothing;
$$;

revoke all on function public.marquer_fiches_lues(uuid) from public, anon;
grant execute on function public.marquer_fiches_lues(uuid) to authenticated;

create or replace function public.fiches_a_noter()
returns table (
  report_id     uuid,
  project_id    uuid,
  project_title text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, pr.id, pr.title
  from public.reading_report_publications pub
  join public.reading_reports r on r.id = pub.reading_report_id
  join public.projects pr on pr.id = r.project_id
  where r.status = 'validee_admin'
    and pr.owner_id = auth.uid()
    and exists (select 1 from public.reading_report_lectures l where l.reading_report_id = r.id)
    and not exists (select 1 from public.reading_report_ratings n where n.reading_report_id = r.id)
  order by r.submitted_at desc;
$$;

revoke all on function public.fiches_a_noter() from public, anon;
grant execute on function public.fiches_a_noter() to authenticated;
