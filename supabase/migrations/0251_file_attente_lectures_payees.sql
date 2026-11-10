-- La file « Projets en attente » ne montrait pas le projet « test » de Sarah
-- (10/11) alors que sa fiche disait « Projet reçu ». La fonction renvoyait
-- encore les ~3 940 projets de WFG 1 au statut « déposé », du plus ancien au
-- plus récent, et l'API s'arrête à 1 000 lignes : le seul projet dont la
-- lecture est payée, le plus récent, n'arrivait jamais jusqu'à la page.
-- La règle du 09/11 (seules comptent les lectures payées) descend dans la
-- fonction elle-même.
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
    and p.status in ('depose', 'en_lecture')
    and exists (select 1 from public.lecture_demandes d where d.project_id = p.id and d.status = 'payee')
  order by 7 asc;
$function$;
