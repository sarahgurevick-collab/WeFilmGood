-- Statistiques : le singulier et le pluriel d'un même mot-clé comptent
-- ensemble (demande de Sarah, 21/11/2026) : « enfant » et « enfants »,
-- « secret » et « secrets ». Rien n'est réécrit dans les mots-clés des
-- projets, des archives ni des films : les formes sont réunies au moment
-- du comptage, sous la forme la plus employée (« parents », « retrouvailles »).
-- Un pluriel n'est réuni que si son singulier existe aussi ; les faux
-- pluriels sont écartés (Paris/pari, fils/fil, Cannes/canne, échecs,
-- urgences, Tours, Lumières, baskets, esprits).
create or replace function public.cle_singulier(p_mot text)
returns text language sql immutable set search_path = public
as $$
  -- le s ou le x final de chaque mot d'au moins quatre lettres, sauf les faux pluriels
  select regexp_replace(
           lower(p_mot),
           '\m(?!(?:paris|fils|cannes|échecs|urgences|tours|lumières|baskets|esprits)\M)(\w{3,})[sx]\M',
           '\1', 'g');
$$;

-- Pour chaque forme qui a une jumelle : la forme retenue (la plus employée,
-- à égalité la plus courte).
create or replace function public.mots_cles_formes_retenues()
returns table (forme text, retenue text)
language sql stable security definer set search_path = public
as $$
  with voc as (
    select lower(x.mot) as mot, count(*) as n from (
      select mot from films_cnc_mots_cles
      union all select mot from archives_mots_cles
      union all select k.label_fr from project_keywords pk join keywords k on k.id = pk.keyword_id
    ) x group by 1
  ),
  cles as (select v.mot, v.n, cle_singulier(v.mot) as cle from voc v),
  classees as (
    select c.mot, c.cle,
           first_value(c.mot) over (partition by c.cle order by c.n desc, length(c.mot), c.mot) as retenue,
           count(*) over (partition by c.cle) as formes
      from cles c
  )
  select mot, retenue from classees where formes > 1;
$$;
revoke all on function public.mots_cles_formes_retenues() from public, anon, authenticated;

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
  formes as materialized (select * from mots_cles_formes_retenues()),
  mots_bruts as (
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
  mots as (
    select distinct b.cle, coalesce(fr.retenue, b.mot) as mot
      from mots_bruts b left join formes fr on fr.forme = b.mot
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

create or replace function public.statistiques_thematiques_films()
returns table (annee int, total int, mot text, nb int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query
  with formes as materialized (select * from mots_cles_formes_retenues()),
  retenus as (
    select f.id, coalesce(f.annee_sortie, f.annee_agrement)::int as an
      from films_cnc f
     where exists (select 1 from films_cnc_mots_cles m where m.film_id = f.id)
  ),
  mots as (
    select distinct m.film_id, coalesce(fr.retenue, lower(m.mot)) as mot
      from films_cnc_mots_cles m left join formes fr on fr.forme = lower(m.mot)
  ),
  totaux as (select r.an, count(*)::int as n from retenus r group by r.an)
  select r.an, t.n, m.mot, count(*)::int
    from retenus r
    join mots m on m.film_id = r.id
    join totaux t on t.an = r.an
   group by r.an, t.n, m.mot
  having count(*) >= 2
   order by r.an, count(*) desc;
end;
$$;
