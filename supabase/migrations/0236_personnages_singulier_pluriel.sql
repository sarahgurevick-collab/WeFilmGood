-- 05/11/2026, Sarah : la recherche des personnages suit la règle de la
-- 0235 (« animal » trouve « animaux », « voisine » trouve « voisin »).
CREATE OR REPLACE FUNCTION public.rechercher_personnages(q text, p_limite integer DEFAULT 60)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  -- Calculé une seule fois (sinon les formes du mot sont refaites pour
  -- chaque personnage : plus de 30 secondes).
  with terme as materialized (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif,
           -- Singulier / pluriel, masculin / féminin (05/11, Sarah).
           public.rx_formes(lower(btrim(public.sans_accent(q)))) as rx
  ),
  par_texte as (
    select c.id,
      greatest(
        case when lower(public.sans_accent(c.name)) = lower(t.mot) then 0.95
             when public.contient(public.sans_accent(c.name), t.motif, t.rx) then 0.85 else 0 end,
        -- Le comédien imaginé par l'auteur (« Juliette Binoche »).
        case when public.contient(public.sans_accent(c.actor_name), t.motif, t.rx) then 0.80 else 0 end,
        case when public.contient(public.sans_accent(c.biography), t.motif, t.rx) then 0.60 else 0 end
      ) as score
    from public.characters c, terme t
    where t.mot is not null
      and (public.contient(public.sans_accent(c.name), t.motif, t.rx) or public.contient(public.sans_accent(c.actor_name), t.motif, t.rx)
           or public.contient(public.sans_accent(c.biography), t.motif, t.rx))
  ),
  par_projet as (
    select c.id, r.score * 0.5 as score
    from public.rechercher_projets(q, 1000) r
    join public.characters c on c.project_id = r.id
    where (select count(*) from public.mots_de_recherche(q)) < 2
  ),
  crit_mots as (select * from public.criteres_de_recherche(q)),
  par_mot_cle as (
    select ck.character_id as id,
           0.45 + 0.45 * count(distinct c.critere)::real
                  / (select count(distinct critere) from crit_mots) as score
    from crit_mots c
    join public.character_keywords ck on ck.keyword_id = c.keyword_id
    group by ck.character_id
    having count(distinct c.critere) = (select count(distinct critere) from crit_mots)
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_texte union all select * from par_projet union all select * from par_mot_cle) u
    group by u.id
  )
  select t.id, t.score::real, count(*) over () as total
  from tous t
  join public.characters c on c.id = t.id
  join public.projects p on p.id = c.project_id
  where auth.uid() is not null
    and p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
  -- À score égal, ceux qui ont un portrait d'abord.
  order by t.score desc, (c.photo_path is not null) desc, c.name
  limit greatest(p_limite, 0);
$function$;
