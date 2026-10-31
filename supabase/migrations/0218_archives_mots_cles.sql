-- Mots-clés des archives de lecture (31/10/2026), tirés de la fiche de
-- lecture, avec les mêmes consignes que les projets : servent aux
-- statistiques des thématiques par année. Administration seulement.
create table if not exists public.archives_mots_cles (
  archive_id uuid not null references public.archives_fiches_lecture(id) on delete cascade,
  mot text not null,
  primary key (archive_id, mot)
);

alter table public.archives_mots_cles enable row level security;
revoke all on public.archives_mots_cles from anon, authenticated;
create policy "archives_mots_cles : administration" on public.archives_mots_cles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.archives_mots_cles to authenticated;

-- Les thématiques par année (statistiques, administration seulement).
-- Chaque histoire compte une fois (deux lecteurs du même titre = une
-- histoire, à sa première année) : une archive rattachée à un projet
-- compte l'année de l'archive (mots de l'archive + du projet), et le
-- projet n'est plus compté à sa propre année.
-- Année d'un projet : sa date sur WFG 1, sinon sa création sur WFG 2.
create or replace function public.statistiques_thematiques(p_format text default null)
returns table (annee int, total int, mot text, nb int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query
  with histoires as ((
    select distinct on (coalesce(a.project_id::text, 'archive:' || lower(regexp_replace(a.titre, '\W', '', 'g'))))
           coalesce(a.project_id::text, 'archive:' || lower(regexp_replace(a.titre, '\W', '', 'g'))) as cle,
           coalesce(substring(a.appel from '(\d{4})')::int, extract(year from a.recue_le)::int) as an,
           p.format as fmt
      from archives_fiches_lecture a
      left join projects p on p.id = a.project_id
     order by 1, 2
    ) union all (
    select p.id::text,
           coalesce(extract(year from (case when w.date ~ '^\d{4}-' then w.date::timestamp end))::int,
                    extract(year from p.created_at)::int),
           p.format
      from projects p
      left join wfg1.projects w on p.legacy_id is not null and w.project_id::text = p.legacy_id
     where not exists (select 1 from archives_fiches_lecture a where a.project_id = p.id)
  )),
  mots as (
    select coalesce(a.project_id::text, 'archive:' || lower(regexp_replace(a.titre, '\W', '', 'g'))) as cle, lower(m.mot) as mot
      from archives_fiches_lecture a join archives_mots_cles m on m.archive_id = a.id
    union
    select a.project_id::text, lower(k.label_fr)
      from archives_fiches_lecture a
      join project_keywords pk on pk.project_id = a.project_id
      join keywords k on k.id = pk.keyword_id
    union
    select p.id::text, lower(k.label_fr)
      from projects p
      join project_keywords pk on pk.project_id = p.id
      join keywords k on k.id = pk.keyword_id
     where not exists (select 1 from archives_fiches_lecture a where a.project_id = p.id)
  ),
  retenues as (
    select h.* from histoires h
     where h.an is not null
       and (p_format is null or h.fmt::text = p_format)
       and exists (select 1 from mots m where m.cle = h.cle)
  ),
  totaux as (select r.an, count(*)::int as n from retenues r group by r.an)
  select r.an, t.n, m.mot, count(*)::int
    from retenues r
    join mots m on m.cle = r.cle
    join totaux t on t.an = r.an
   group by r.an, t.n, m.mot
  having count(*) >= 2
   order by r.an, count(*) desc;
end;
$$;

revoke all on function public.statistiques_thematiques(text) from public, anon;
grant execute on function public.statistiques_thematiques(text) to authenticated;
