-- Les mots-clés de WFG 1 effacés le 01/11 (04/11/2026, Sarah : « remets-les »).
-- 0086 et 0154 faisaient « on conflict do nothing » : quand l'IA avait déjà
-- posé le même mot, le lien gardait la source de l'IA (ou aucune), et la
-- refonte du 01/11 (0221) l'a effacé avec les mots de l'IA. ~840 liens.
--
-- On repose ce que 0086 (familles 2, 3, 4, 6 de la fiche) et 0154 (familles
-- 5 et 6, fiche et personnages) avaient posé, sans rien effacer ; un lien
-- déjà présent passe en source 'wfg1' pour ne plus pouvoir être effacé par
-- l'IA. Jamais « Royaume-Uni » (5-0). Rejouable.

create temporary table a_reposer on commit drop as
with jetons as (
  select p.project_id::text as lid, t.tok, 'fiche' as origine
  from wfg1.projects p
  cross join lateral unnest(string_to_array(coalesce(p.keywords, ''), '|')) as t(tok)
  union all
  select p.project_id::text, t.tok, 'perso'
  from wfg1.projects p
  cross join lateral unnest(string_to_array(coalesce(p.character_keywords, ''), '|')) as t(tok)
),
dico as (
  select distinct on (category, keyword) category, keyword, btrim(fr) as fr
  from wfg1.keywords
  where coalesce(btrim(fr), '') <> ''
  order by category, keyword, keyword_id
)
select distinct pr.id as project_id, k.category as famille, k.fr as libelle,
  btrim(regexp_replace(lower(public.sans_accent(k.fr)), '[^a-z0-9]+', '_', 'g'), '_') as slug
from jetons j
join dico k on (k.category || '-' || k.keyword) = j.tok
join public.projects pr on pr.legacy_id = j.lid
where ((j.origine = 'fiche' and k.category in (2, 3, 4, 5, 6))
    or (j.origine = 'perso' and k.category in (5, 6)))
  and not (k.category = 5 and k.keyword = 0);

insert into public.keywords (slug, label_fr)
select distinct on (a.slug) a.slug,
  case when substr(a.libelle, 2) ~ '[[:upper:]]' or a.famille = 5 then a.libelle
       else lower(substr(a.libelle, 1, 1)) || substr(a.libelle, 2) end
from a_reposer a
where a.slug <> ''
  and not exists (select 1 from public.keywords k where k.slug = a.slug)
order by a.slug, a.famille;

insert into public.project_keywords (project_id, keyword_id, source)
select distinct a.project_id, k.id, 'wfg1'
from a_reposer a
join public.keywords k on k.slug = a.slug
on conflict (project_id, keyword_id) do update
  set source = 'wfg1'
  where public.project_keywords.source is null or public.project_keywords.source = 'ia';
