-- =====================================================================
-- Les fiches de lecture restent privées ; leur nombre est public.
--
-- Une fiche de lecture touche à quelque chose de très personnel : elle
-- discute des idées que l'auteur n'a pas forcément gardées, et il n'a
-- aucune envie qu'un producteur tombe dessus. Par défaut, seuls l'auteur
-- et l'administration la lisent — c'était déjà le cas.
--
-- Elles sont aussi le travail de WeFilmGood, qui ne doit pas être
-- copié : pas question de les montrer, même à la demande de l'auteur.
--
-- Ce qui change : tout membre voit COMBIEN de fiches existent sur un
-- projet. Trois, quatre, cinq lectures montrent un auteur qui travaille :
-- c'est une information utile au producteur, qui doit alors demander la
-- fiche à l'auteur ou à WeFilmGood — et entre ainsi en contact avec lui.
-- =====================================================================

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

-- Les fiches publiées sur WFG 2, sans le prénom du lecteur, pour les
-- afficher sur la fiche projet — à l'auteur et à l'administration.
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
    and (p.owner_id = auth.uid() or public.is_admin())
  order by r.submitted_at desc nulls last;
$$;

grant execute on function public.fiches_lecture_publiees(uuid) to authenticated;
