-- Sarah, 15/11 : « Un projet labellisé ne perd jamais son label. L'auteur
-- peut sereinement le déposer à nouveau après amélioration, sans crainte. »
--
-- 1. La base le garantit : quel que soit le résultat d'une nouvelle lecture,
--    un projet « labellisé » le reste. (Pour corriger une erreur de label,
--    passer par une migration qui désactive ce déclencheur.)
create or replace function public.label_a_vie()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if old.status::text = 'labellise' and new.status::text <> 'labellise' then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists label_a_vie on public.projects;
create trigger label_a_vie
  before update of status on public.projects
  for each row execute function public.label_a_vie();

-- 2. Un projet labellisé renvoyé à la lecture paraît dans la file
--    « Projets en attente » sans quitter son statut : il y est tant qu'aucune
--    fiche n'a été validée depuis son dernier envoi.
create or replace function public.admin_pending_projects()
 returns table(project_id uuid, author_name text, author_email text, title text, format project_format, language text, submitted_at timestamp with time zone, current_reader_id uuid, current_reader_name text, reader_refusal_count integer, reading_status text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select
    p.id,
    author.full_name,
    au.email,
    p.title,
    p.format,
    p.language,
    coalesce(
      (select max(d.paid_at) from public.lecture_demandes d where d.project_id = p.id and d.status = 'payee'),
      p.created_at
    ),
    la.reader_id,
    reader.full_name,
    p.reader_refusal_count,
    coalesce(la.status::text, 'sans_lecteur')
  from public.projects p
  join public.profiles author on author.id = p.owner_id
  join auth.users au on au.id = p.owner_id
  left join lateral (
    select a.reader_id, a.status
    from public.reading_assignments a
    where a.project_id = p.id
    order by a.assigned_at desc
    limit 1
  ) la on true
  left join public.profiles reader on reader.id = la.reader_id
  where public.is_admin()
    and (
      (p.status in ('depose', 'en_lecture')
        and exists (select 1 from public.lecture_demandes d where d.project_id = p.id and d.status = 'payee'))
      or (p.status = 'labellise'
        and exists (
          select 1 from public.lecture_demandes d
          where d.project_id = p.id and d.status = 'payee'
            and not exists (
              select 1 from public.legacy_reading_reports l
              where l.project_id = p.id and l.statut = 2 and l.read_at >= d.paid_at)
            and not exists (
              select 1 from public.reading_reports r
              where r.project_id = p.id and r.admin_validated_at >= d.paid_at)
        ))
    )
  order by 7 asc;
$function$;

-- 3. Les projets labellisés qui attendaient une nouvelle lecture sur WFG 1
--    (« DUSTLINE » et « Nepenthes Rajah » le 15/11) reçoivent leur demande
--    « reprise », comme dans 0276 et 0278. Les lectures déjà confiées se
--    posent en rejouant 0277.
do $$
begin
  if to_regclass('wfg1_final.projects') is null then
    raise notice 'schéma wfg1_final absent : rien à faire';
    return;
  end if;

  insert into public.lecture_demandes
    (project_id, profile_id, status, amount_cents, payment_provider, payment_reference, created_at, paid_at)
  select p.id, p.owner_id, 'payee', 0, 'reprise', 'wfg1-' || w.project_id,
         w.date::timestamp at time zone 'Europe/Paris',
         w.date::timestamp at time zone 'Europe/Paris'
  from wfg1_final.projects w
  join public.projects p on p.legacy_id = w.project_id::text
  where w.status = 1
    and p.status = 'labellise'
    and exists (select 1 from wfg1_final.projects_review r where r.project = w.project_id and r.status = 0)
    and not exists (select 1 from wfg1_final.projects_review r where r.project = w.project_id and r.status = 1)
    and not exists (select 1 from public.lecture_demandes d where d.project_id = p.id);
end $$;
