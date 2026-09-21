-- =====================================================================
-- Les fiches de lecture restent privées, sauf si l'auteur les montre.
--
-- Une fiche de lecture touche à quelque chose de très personnel : elle
-- discute des idées que l'auteur n'a pas forcément gardées, et il n'a
-- aucune envie qu'un producteur tombe dessus. Par défaut, seuls l'auteur
-- et l'administration la lisent — c'était déjà le cas.
--
-- Ce qui change :
--   1. Tout membre voit COMBIEN de fiches existent sur un projet. Trois,
--      quatre, cinq lectures montrent un auteur qui travaille : c'est
--      une information utile au producteur, qui pensera à demander la
--      fiche à l'auteur ou à WeFilmGood.
--   2. L'auteur qui est content de ses fiches peut les rendre visibles
--      à tous les membres (projects.fiches_lecture_visibles).
--
-- Même visibles, les fiches ne portent jamais le nom du lecteur.
-- =====================================================================

alter table public.projects
  add column if not exists fiches_lecture_visibles boolean not null default false;

comment on column public.projects.fiches_lecture_visibles is
  'L''auteur a choisi de montrer ses fiches de lecture à tous les membres.';

-- Le nombre de fiches, pour tout membre connecté. Rien d'autre ne sort.
create or replace function public.nombre_fiches_lecture(p_project_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case when auth.uid() is null then 0 else (
    (select count(*) from public.legacy_reading_reports l where l.project_id = p_project_id)
    + (select count(*) from public.reading_reports r
       join public.reading_report_publications pub on pub.reading_report_id = r.id
       where r.project_id = p_project_id and r.status = 'validee_admin')
  )::integer end;
$$;

grant execute on function public.nombre_fiches_lecture(uuid) to authenticated;

-- Les fiches héritées de WFG 1 : l'auteur, l'administration, et tout
-- membre si l'auteur les a rendues visibles.
create or replace function public.get_legacy_reading_reports(p_project_id uuid)
returns table (
  legacy_review_id integer,
  content text,
  final_mark smallint,
  wfg_review text,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.legacy_review_id, r.content, r.final_mark, r.wfg_review, r.read_at
  from public.legacy_reading_reports r
  join public.projects p on p.id = r.project_id
  where r.project_id = p_project_id
    and (p.owner_id = auth.uid()
         or public.is_admin()
         or (p.fiches_lecture_visibles and auth.uid() is not null))
  order by r.read_at desc nulls last;
$$;

-- Les fiches publiées sur WFG 2, sans le prénom du lecteur : c'est
-- cette version qui s'affiche sur la fiche projet.
create or replace function public.fiches_lecture_publiees(p_project_id uuid)
returns table (
  report_id    uuid,
  content      text,
  score        smallint,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, pub.content, pub.score, r.submitted_at
  from public.reading_report_publications pub
  join public.reading_reports r on r.id = pub.reading_report_id
  join public.projects p on p.id = r.project_id
  where r.project_id = p_project_id
    and r.status = 'validee_admin'
    and (p.owner_id = auth.uid()
         or public.is_admin()
         or (p.fiches_lecture_visibles and auth.uid() is not null))
  order by r.submitted_at desc nulls last;
$$;

grant execute on function public.fiches_lecture_publiees(uuid) to authenticated;
