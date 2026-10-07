-- Recherche de projets à plusieurs mots : classement par la phrase entière
-- (titre exact, titre, texte) au lieu d'un score unique (07/10/2026).
CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text, p_selection text DEFAULT NULL::text, p_comedien text DEFAULT NULL::text)
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
        case when public.sans_accent(p.synopsis) ilike t.motif then 0.40 else 0 end,
        -- Les personnages (28/09) : leur nom et leurs quelques lignes, où
        -- l'auteur nomme le comédien qu'il imagine (« Juliette Binoche »).
        case when exists (select 1 from public.characters c where c.project_id = p.id
                           and (public.sans_accent(c.name) ilike t.motif or public.sans_accent(c.actor_name) ilike t.motif or public.sans_accent(c.biography) ilike t.motif))
             then 0.42 else 0 end,
        -- Les comédiens envisagés par l'auteur (30/09) : un directeur de
        -- casting tape « Bryan Cranston » dans le champ de recherche.
        case when exists (select 1 from public.project_actors a where a.project_id = p.id
                           and public.sans_accent(a.libelle) ilike t.motif)
             then 0.70 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (public.sans_accent(p.title) ilike t.motif or public.sans_accent(p.logline) ilike t.motif
           or public.sans_accent(p.synopsis) ilike t.motif or public.sans_accent(p.country) ilike t.motif
           or exists (select 1 from public.characters c where c.project_id = p.id
                      and (public.sans_accent(c.name) ilike t.motif or public.sans_accent(c.actor_name) ilike t.motif or public.sans_accent(c.biography) ilike t.motif))
           or exists (select 1 from public.project_actors a where a.project_id = p.id
                      and public.sans_accent(a.libelle) ilike t.motif))
  ),
  par_phrase as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  ),
  -- Plusieurs mots = plusieurs critères, tous requis (30/09/2026, même
  -- règle que pour les talents) : « espagnol musique » ne garde que les
  -- projets qui cochent espagnol ET musique, par un mot-clé ou par leur
  -- texte. Un seul mot : la recherche d'avant, par la phrase entière.
  mots_q as (select w from public.mots_de_recherche(q) w),
  nb as (select count(*)::int as n from mots_q),
  coches as (
    select pk.project_id, c.critere
    from public.criteres_de_recherche(q) c
    join public.project_keywords pk on pk.keyword_id = c.keyword_id
    union
    select p.id, m.w
    from public.projects p, mots_q m
    where public.sans_accent(concat_ws(' ', p.title, p.logline, p.synopsis)) ilike '%' || m.w || '%'
    union
    select a.project_id, m.w
    from public.project_actors a, mots_q m
    where public.sans_accent(a.libelle) ilike '%' || m.w || '%'
    union
    select c.project_id, m.w
    from public.characters c, mots_q m
    where public.sans_accent(c.actor_name) ilike '%' || m.w || '%'
  ),
  par_criteres as (
    -- Le classement (07/10) : tous les projets qui cochent tous les mots
    -- avaient le même score 0.9, donc le plus récent passait devant :
    -- « Les Feuilles mortes » arrivait derrière un projet qui n'en parle
    -- qu'en passant. La phrase entière dans le titre passe maintenant
    -- avant la phrase dans le texte, avant les mots épars.
    select co.project_id,
      greatest(
        0.6,
        case when lower(public.sans_accent(p.title)) = lower(t.mot) then 1.00
             when public.sans_accent(p.title) ilike t.motif then 0.95 else 0 end,
        case when public.sans_accent(p.logline) ilike t.motif
               or public.sans_accent(p.synopsis) ilike t.motif then 0.80 else 0 end
      ) as score
    from coches co
    join public.projects p on p.id = co.project_id
    cross join nb
    cross join terme t
    group by co.project_id, nb.n, p.title, p.logline, p.synopsis, t.mot, t.motif
    having count(distinct co.critere) = nb.n
  ),
  tous as (
    select * from par_phrase where (select n from nb) < 2
    union all
    select * from par_criteres where (select n from nb) >= 2
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
      and (p_selection is null or exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = p_selection))
      and (p_comedien is null or exists (select 1 from public.project_actors a where a.project_id = p.id and a.libelle = p_comedien))
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  order by t.score desc, p.created_at desc
  limit p_limite;
$function$;
