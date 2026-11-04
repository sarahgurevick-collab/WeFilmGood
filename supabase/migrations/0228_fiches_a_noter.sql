-- Les fiches de lecture publiées qu'un auteur n'a pas encore notées
-- (04/11/2026, Sarah : « rendre obligatoire cette emoticone ») : un bandeau
-- reste sur Mes projets et sur la fiche projet tant qu'il n'a pas choisi
-- d'emoji. Rien sur le lecteur n'est renvoyé.
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
    and not exists (select 1 from public.reading_report_ratings n where n.reading_report_id = r.id)
  order by r.submitted_at desc;
$$;

revoke all on function public.fiches_a_noter() from public, anon;
grant execute on function public.fiches_a_noter() to authenticated;
