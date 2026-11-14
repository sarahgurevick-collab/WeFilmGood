-- Suite de 0276 (Sarah, 14/11 : « Oui, mêmes lecteurs ») : les lectures déjà
-- confiées à un lecteur sur WFG 1, et pas encore écrites, sont confiées au
-- même lecteur sur WFG 2. La mission arrive « proposée », datée du jour où
-- elle a été confiée sur WFG 1 ; le projet passe « en lecture », comme le
-- fait admin_reassign_reader. Aucun email ne part.
-- Les lecteurs absents de WFG 2 sont laissés de côté : leur projet reste
-- dans la file, sans lecteur. Rejouable : un projet qui a déjà une mission
-- n'en reçoit pas une seconde.
do $$
begin
  if to_regclass('wfg1_final.projects_review') is null then
    raise notice 'schéma wfg1_final absent : rien à faire';
    return;
  end if;

  with confiees as (
    select distinct on (p.id) p.id as project_id, lecteur.id as reader_id,
           r.date::timestamp at time zone 'Europe/Paris' as le
    from wfg1_final.projects_review r
    join public.projects p on p.legacy_id = r.project::text
    join public.lecture_demandes d
      on d.project_id = p.id and d.payment_reference = 'wfg1-' || r.project
    join public.profiles lecteur on lecteur.legacy_user_id = r.reader
    where r.status = 0
      and exists (select 1 from public.profile_roles pr
                  where pr.profile_id = lecteur.id and pr.role_slug = 'lecteur')
      and not exists (select 1 from public.reading_assignments a where a.project_id = p.id)
    order by p.id, r.date desc
  ), posees as (
    insert into public.reading_assignments (project_id, reader_id, status, assigned_by, assigned_at, created_at)
    select c.project_id, c.reader_id, 'proposee',
           (select id from public.profiles where legacy_user_id = 13 limit 1), c.le, now()
    from confiees c
    returning project_id
  )
  update public.projects p set status = 'en_lecture'
  from posees where p.id = posees.project_id and p.status = 'depose';
end $$;
