-- =====================================================================
-- La recherche avancée de la pitchothèque, reprise de WFG 1.
--
-- Format, genre, audience, budget et langue du projet servaient à
-- retrouver un projet sur WFG 1 (bouton « Recherche avancée »). Sur
-- WFG 2, ils n'étaient qu'affichés. Les deux fonctions de la
-- pitchothèque — l'ordre du catalogue et la recherche par mot — prennent
-- désormais ces cinq filtres, tous facultatifs (null = pas de filtre).
--
-- Les signatures changent : on supprime les anciennes, sinon PostgREST
-- ne saurait plus laquelle appeler.
--
-- Non repris de WFG 1, pour l'instant : le pays de l'auteur (les pays
-- des profils hérités sont en codes, les nouveaux en toutes lettres),
-- le pays de l'action (abandonné : les mots-clés s'en chargent) et
-- l'avancement du projet (aucun champ sur WFG 2 pour l'instant).
-- =====================================================================

drop function if exists public.pitchotheque(int, int);
drop function if exists public.rechercher_projets(text, int);

create or replace function public.pitchotheque(
  p_limite int default 60,
  p_decalage int default 0,
  p_format text default null,
  p_genre text default null,
  p_audience text default null,
  p_budget text default null,
  p_langue text default null
)
returns table (id uuid, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  personnages as (
    select c.project_id, count(*) as nombre
    from public.characters c
    group by c.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      (coalesce(btrim(p.videopitch_fr), '') <> ''
       or coalesce(btrim(p.videopitch_en), '') <> ''
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      round(
        (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
         + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
         + case when coalesce(f.a_vignette, false) then 20 else 0 end
         + case when coalesce(f.a_scenario, false) then 20 else 0 end
         + case when p.genre_slug is not null then 10 else 0 end
         + case when p.format is not null then 10 else 0 end
         + case when coalesce(pe.nombre, 0) > 0 then 10 else 0 end) * 100.0 / 110
      ) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    left join personnages pe on pe.project_id = p.id
    where p.is_public
      and (p_format is null or p.format::text = p_format)
      and (p_genre is null or p.genre_slug = p_genre)
      and (p_audience is null or p.target_audience = p_audience)
      and (p_budget is null or p.budget_range = p_budget)
      and (p_langue is null or p.language = p_langue)
  )
  select
    n.id,
    count(*) over () as total
  from notes n
  order by
    case
      when n.labellise then 0
      when n.a_videopitch then 1
      else 2
    end,
    case
      when n.labellise then 0
      when n.remplissage >= 50 then 1
      when n.remplissage >= 30 then 2
      else 3
    end,
    md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text)
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$$;

grant execute on function public.pitchotheque(int, int, text, text, text, text, text) to authenticated;

create or replace function public.rechercher_projets(
  q text,
  p_limite int default 60,
  p_format text default null,
  p_genre text default null,
  p_audience text default null,
  p_budget text default null,
  p_langue text default null
)
returns table (id uuid, score real, total bigint)
language sql
stable
as $$
  with terme as (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(k.label_fr) = lower(t.mot) then 1.00  -- le mot-clé exact
        when k.label_fr ilike t.motif then 0.90          -- "road" dans "road trip"
        else 0.60                                        -- rattrapé par similarité (faute de frappe)
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
  ),
  par_mot as (
    select pk.project_id, max(m.score) as score
    from public.project_keywords pk
    join mots m on m.id = pk.keyword_id
    group by pk.project_id
  ),
  par_texte as (
    select p.id as project_id,
      greatest(
        case when lower(p.title) = lower(t.mot) then 0.95
             when p.title ilike t.motif then 0.75 else 0 end,
        case when p.logline ilike t.motif then 0.50 else 0 end,
        case when p.synopsis ilike t.motif then 0.40 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (p.title ilike t.motif or p.logline ilike t.motif or p.synopsis ilike t.motif)
  ),
  tous as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  )
  select t.project_id, t.score::real, count(*) over () as total
  from tous t
  join public.projects p on p.id = t.project_id
  where p.is_public
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_langue is null or p.language = p_langue)
  order by t.score desc, p.created_at desc
  limit p_limite;
$$;

grant execute on function public.rechercher_projets(text, int, text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
