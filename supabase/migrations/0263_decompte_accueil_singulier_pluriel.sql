-- 13/11/2026, Sarah : sur la page d'accueil, « zombie » et « zombies » ne
-- donnaient pas les mêmes nombres (5 talents et 6 personnages contre 2 et 4).
-- La règle du 05/11 (0235 : singulier = pluriel, masculin = féminin, sans
-- accents) avait été posée sur les recherches des Galaxies, pas sur ce
-- décompte. Il la suit maintenant ; ce qu'il compte ne change pas.
CREATE OR REPLACE FUNCTION public.compter_recherche(q text)
 RETURNS TABLE(projets bigint, talents bigint, personnages bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  -- Calculé une seule fois (sinon les formes du mot sont refaites à chaque ligne).
  with terme as materialized (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           public.rx_formes(lower(btrim(public.sans_accent(q)))) as rx
  ),
  mots as materialized (
    select k.id from public.keywords k, terme t
    where t.mot is not null
      and (public.contient(public.sans_accent(k.label_fr), t.motif, t.rx)
           or similarity(public.sans_accent(k.label_fr), t.mot) >= 0.45)
  ),
  -- Les langues dont le nom commence le mot cherché (« italien », « italienne »).
  langues as (
    select g.code from public.languages g, terme t
    where t.mot is not null and position(' ' in g.label_fr) = 0
      and lower(t.mot) like lower(public.sans_accent(g.label_fr)) || '%'
  )
  select
    (select count(distinct p.id) from public.projects p, terme t
       where t.mot is not null and p.is_public and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
         and (public.contient(public.sans_accent(p.title), t.motif, t.rx)
              or public.contient(public.sans_accent(p.logline), t.motif, t.rx)
              or public.contient(public.sans_accent(p.synopsis), t.motif, t.rx)
              or exists (select 1 from public.characters c where c.project_id = p.id
                         and public.contient(public.sans_accent(c.actor_name), t.motif, t.rx))
              or exists (select 1 from public.project_keywords pk
                         where pk.project_id = p.id and pk.keyword_id in (select id from mots)))),
    (select count(*) from public.profiles pr, terme t
       where t.mot is not null
         and (public.contient(public.sans_accent(pr.biofilmo), t.motif, t.rx)
              or public.contient(public.sans_accent(pr.full_name), t.motif, t.rx)
              or public.contient(public.sans_accent(pr.display_name), t.motif, t.rx)
              or exists (select 1 from public.profile_languages pl
                         where pl.profile_id = pr.id and pl.language_code in (select code from langues)))
         and coalesce(pr.category::text, '') <> 'cinephile'),
    (select count(*) from public.characters c
       join public.projects p on p.id = c.project_id, terme t
       where t.mot is not null and p.is_public and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
         and (public.contient(public.sans_accent(c.name), t.motif, t.rx)
              or public.contient(public.sans_accent(c.actor_name), t.motif, t.rx)
              or public.contient(public.sans_accent(c.biography), t.motif, t.rx)));
$function$;
