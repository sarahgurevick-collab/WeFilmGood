-- Les fiches qui contiennent le mot cherché passent avant les mots-clés
-- rattrapés par ressemblance (27/09/2026) : « poisson » remontait d'abord
-- les projets du mot-clé « poison » (une lettre d'écart, que la tolérance
-- aux fautes de frappe ne sait pas distinguer), avant les fiches qui
-- parlent vraiment de poissons.
CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with terme as (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    -- Sans accents (27/09) : « algerie » trouve « Algérie ».
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(public.sans_accent(k.label_fr)) = lower(t.mot) then 1.00  -- le mot-clé exact
        when public.sans_accent(k.label_fr) ilike t.motif then 0.90          -- "road" dans "road trip"
        else 0.35                                        -- rattrapé par similarité (faute de frappe) : après les fiches qui contiennent le mot
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (public.sans_accent(k.label_fr) ilike t.motif or similarity(public.sans_accent(k.label_fr), t.mot) >= 0.45)
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
        case when lower(public.sans_accent(p.title)) = lower(t.mot) then 0.95
             when public.sans_accent(p.title) ilike t.motif then 0.75 else 0 end,
        case when public.sans_accent(p.logline) ilike t.motif then 0.50 else 0 end,
        -- Le pays où se déroule l'action (27/09) : « Algérie » remonte
        -- tous les projets qui s'y passent, même s'ils ne le disent pas
        -- dans leur texte. Il remplace le filtre par pays de WFG 1.
        case when public.sans_accent(p.country) ilike t.motif then 0.45 else 0 end,
        case when public.sans_accent(p.synopsis) ilike t.motif then 0.40 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (public.sans_accent(p.title) ilike t.motif or public.sans_accent(p.logline) ilike t.motif
           or public.sans_accent(p.synopsis) ilike t.motif or public.sans_accent(p.country) ilike t.motif)
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
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  order by t.score desc, p.created_at desc
  limit p_limite;
$function$;
