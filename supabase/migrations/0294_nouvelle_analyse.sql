-- « Nouvelle analyse » (20/11/2026, Sarah) : une auteure dont le projet a déjà
-- été lu peut, sur la MÊME fiche, déposer sa version retravaillée et payer
-- une nouvelle lecture (50 € adhérent, 60 € sinon). Jusqu'ici, une lecture
-- payée fermait le bouton « Envoyer » pour toujours.
--
-- Une demande payée est « en cours » tant qu'aucune analyse n'a été rendue
-- depuis son paiement (publication WFG 2, fiche WFG 1 vérifiée ou fiche
-- validée). C'est la même règle que celle de la file « Projets en attente »
-- pour les projets labellisés (0279).

create or replace function public.lecture_demande_en_cours(p_project_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path to ''
as $$
  select max(d.paid_at)
  from public.lecture_demandes d
  join public.projects p on p.id = d.project_id
  where d.project_id = p_project_id
    and d.status = 'payee'
    and (p.owner_id = auth.uid() or public.is_admin())
    and not exists (
      select 1 from public.reading_report_publications pub
      join public.reading_reports r on r.id = pub.reading_report_id
      where r.project_id = d.project_id and pub.published_at >= d.paid_at)
    and not exists (
      select 1 from public.legacy_reading_reports l
      where l.project_id = d.project_id and l.statut = 2 and l.read_at >= d.paid_at)
    and not exists (
      select 1 from public.reading_reports r
      where r.project_id = d.project_id and r.admin_validated_at >= d.paid_at);
$$;

grant execute on function public.lecture_demande_en_cours(uuid) to authenticated;

-- La file de l'administration : un projet « lu mais pas labellisé » qui
-- repaie une lecture y reparaît, comme un projet labellisé.
create or replace function public.admin_pending_projects()
 returns table(project_id uuid, author_name text, author_email text, title text, format project_format, language text, submitted_at timestamp with time zone, current_reader_id uuid, current_reader_name text, reader_refusal_count integer, reading_status text)
 language sql
 stable
 security definer
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
      or (p.status in ('labellise', 'lecture_terminee_non_labellise')
        and exists (
          select 1 from public.lecture_demandes d
          where d.project_id = p.id and d.status = 'payee'
            and not exists (
              select 1 from public.legacy_reading_reports l
              where l.project_id = p.id and l.statut = 2 and l.read_at >= d.paid_at)
            and not exists (
              select 1 from public.reading_reports r
              where r.project_id = p.id and r.admin_validated_at >= d.paid_at)
            and not exists (
              select 1 from public.reading_report_publications pub
              join public.reading_reports r on r.id = pub.reading_report_id
              where r.project_id = p.id and pub.published_at >= d.paid_at)
        ))
    )
  order by 7 asc;
$function$;

-- L'auteur ne peut rien changer pendant la nouvelle lecture non plus.
create or replace function public.scenario_en_lecture(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    (
      (
        exists (
          select 1 from public.lecture_demandes d
          where d.project_id = p_project_id
            and d.status = 'payee'
            and coalesce(d.paid_at, d.created_at) < now() - interval '15 minutes'
        )
        or exists (
          select 1 from public.reading_assignments a
          where a.project_id = p_project_id and a.status <> 'refusee'
        )
        or exists (select 1 from public.reading_reports r where r.project_id = p_project_id)
        or exists (
          select 1 from public.projects p
          where p.id = p_project_id and p.status::text = 'en_lecture'
        )
      )
      and not exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      )
    )
    or (
      -- Nouvelle analyse : une demande payée (depuis plus de 15 minutes)
      -- que ni une publication ni une fiche vérifiée n'a suivie.
      exists (
        select 1 from public.lecture_demandes d
        where d.project_id = p_project_id
          and d.status = 'payee'
          and coalesce(d.paid_at, d.created_at) < now() - interval '15 minutes'
          and not exists (
            select 1 from public.reading_report_publications pub
            join public.reading_reports r on r.id = pub.reading_report_id
            where r.project_id = d.project_id and pub.published_at >= d.paid_at)
          and not exists (
            select 1 from public.legacy_reading_reports l
            where l.project_id = d.project_id and l.statut = 2 and l.read_at >= d.paid_at)
      )
    )
    or (
      -- WFG 1 : une fiche attribuée ou à valider, aucune encore vérifiée.
      exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id and l.statut in (0, 1))
      and not exists (select 1 from public.legacy_reading_reports l where l.project_id = p_project_id and l.statut = 2)
    );
$$;

grant execute on function public.scenario_en_lecture(uuid) to authenticated;

-- Le suivi montré à l'auteur : pendant une nouvelle analyse, il repart de
-- « attribution » (seules comptent les attributions et fiches postérieures
-- au paiement) ; hors nouvelle analyse, rien ne change.
create or replace function public.etat_de_lecture(p_project_id uuid)
 returns table(etat text, depose_le timestamp with time zone, rendue_le timestamp with time zone)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  with p as (
    select pr.*
    from public.projects pr
    where pr.id = p_project_id
      and (pr.owner_id = auth.uid() or public.is_admin())
  ),
  demande as (
    select
      max(d.paid_at) as payee_le,
      public.lecture_demande_en_cours(p_project_id) as en_cours_le
    from public.lecture_demandes d
    where d.project_id = p_project_id and d.status = 'payee'
  ),
  wfg2 as (
    select
      exists (
        select 1 from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee,
      exists (select 1 from public.reading_reports r where r.project_id = p_project_id) as rendue,
      exists (
        select 1 from public.reading_assignments a
        where a.project_id = p_project_id and a.status in ('en_cours', 'rendue')
      ) as en_lecture,
      exists (
        select 1 from public.reading_reports r, demande
        where r.project_id = p_project_id and r.submitted_at > demande.en_cours_le
      ) as rendue_apres,
      exists (
        select 1 from public.reading_assignments a, demande
        where a.project_id = p_project_id and a.status in ('en_cours', 'rendue')
          and a.assigned_at > demande.en_cours_le
      ) as en_lecture_apres,
      (
        select max(pub.published_at) from public.reading_report_publications pub
        join public.reading_reports r on r.id = pub.reading_report_id
        where r.project_id = p_project_id
      ) as publiee_le
  ),
  wfg1 as (
    select
      bool_or(l.statut = 2) as verifiee,
      bool_or(l.statut = 1) as a_valider,
      bool_or(l.statut = 0) as attribuee,
      max(l.read_at) filter (where l.statut = 2) as lue_le,
      (
        select w.status from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as statut_projet,
      (
        select nullif(w.date, '')::timestamptz from wfg1.projects w
        where w.project_id::text = (select legacy_id::text from p)
        limit 1
      ) as depose_wfg1
    from public.legacy_reading_reports l
    where l.project_id = p_project_id
  ),
  calcul as (
    select
      case
        -- Nouvelle analyse en cours : on repart du paiement.
        when demande.en_cours_le is not null and wfg2.publiee and wfg2.rendue_apres then 'relecture'
        when demande.en_cours_le is not null and wfg2.publiee and wfg2.en_lecture_apres then 'premiere_lecture'
        when demande.en_cours_le is not null and wfg2.publiee then 'attribution'
        when demande.en_cours_le is not null and coalesce(wfg1.verifiee, false)
          and not wfg2.en_lecture and not wfg2.rendue then 'attribution'
        when wfg2.publiee then 'disponible'
        when wfg2.rendue then 'relecture'
        when wfg2.en_lecture then 'premiere_lecture'
        when demande.payee_le is not null then 'attribution'
        when p.legacy_id is null then null
        when coalesce(wfg1.verifiee, false) then 'disponible'
        when coalesce(wfg1.a_valider, false) then 'relecture'
        when coalesce(wfg1.attribuee, false) or wfg1.statut_projet::text = '1' then 'premiere_lecture'
        else null
      end as etat,
      case
        when demande.en_cours_le is not null then demande.en_cours_le
        when demande.payee_le is not null then demande.payee_le
        when p.legacy_id is not null then coalesce(wfg1.depose_wfg1, p.created_at)
        else p.created_at
      end as depose_le,
      coalesce(wfg2.publiee_le, wfg1.lue_le) as rendue_le
    from p, demande, wfg2, wfg1
  )
  select etat, depose_le, rendue_le from calcul where etat is not null;
$function$;
