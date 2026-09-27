-- Reprise des mots-clés de WFG 1 (27/09/2026, décision de Sarah) : les
-- familles 2 (tons), 3 (thèmes), 4 (source, construction), 6 (lieux,
-- époques), 7 (festivals) et 8 (comédiens souhaités) s'ajoutent aux
-- mots-clés générés automatiquement — rien n'est remplacé. Le format (0),
-- le genre (1) et le pays (5) ont leur propre case ; le pays
-- « Royaume-Uni » (5-0), coché par défaut sur WFG 1, n'est jamais repris.
-- Les codes abîmés (trois nombres, « 3-1683-360 ») ne sont pas repris
-- ici : ils sont listés à part pour vérification.
--
-- Rapprochement par « slug » (minuscules, sans accents) : un mot déjà
-- présent sur WFG 2 est réutilisé, un mot nouveau est créé. La colonne
-- project_keywords.source garde la trace de ce qui vient de WFG 1.

alter table public.project_keywords add column if not exists source text;

-- Rejouable : on retire d'abord ce que cet import avait posé, et les mots
-- qu'il avait créés et qui ne servent plus à rien.
delete from public.project_keywords where source = 'wfg1';
delete from public.keywords k
 where k.id > 3017  -- les 3 015 mots existant avant cet import vont jusqu'à 3017
   and not exists (select 1 from public.project_keywords pk where pk.keyword_id = k.id);

create temporary table anciens on commit drop as
with codes as (
  select p.id as project_id, m[1]::int as famille, m[2]::int as numero
  from wfg1.projects w
  join public.projects p on p.legacy_id = w.project_id::text,
  lateral regexp_matches(w.keywords, '\|(\d+)-(\d+)(?=\|)', 'g') m
)
select distinct c.project_id, c.famille,
  btrim(k.fr) as libelle,
  btrim(regexp_replace(lower(public.sans_accent(btrim(k.fr))), '[^a-z0-9]+', '_', 'g'), '_') as slug
from codes c
join (
  -- 38 codes du dictionnaire portent plusieurs libellés (des synonymes :
  -- « Braquage de banque », « Braquage », « Cambriolage »). On ne garde
  -- que le libellé d'origine, celui du plus petit identifiant.
  select distinct on (category, keyword) category, keyword, fr
  from wfg1.keywords
  where coalesce(btrim(fr), '') <> ''
  order by category, keyword, keyword_id
) k on k.category = c.famille and k.keyword = c.numero
where c.famille in (2, 3, 4, 6, 7, 8)
  and coalesce(btrim(k.fr), '') <> '';

-- Les mots nouveaux : minuscule initiale pour les tons, thèmes, sources et
-- lieux (comme les mots-clés de WFG 2), sauf s'ils portent d'autres
-- majuscules (noms propres) ; festivals et comédiens gardent leur graphie.
insert into public.keywords (slug, label_fr)
select distinct on (a.slug) a.slug,
  case
    when a.famille in (7, 8) or substr(a.libelle, 2) ~ '[[:upper:]]' then a.libelle
    else lower(substr(a.libelle, 1, 1)) || substr(a.libelle, 2)
  end
from anciens a
where a.slug <> ''
  and not exists (select 1 from public.keywords k where k.slug = a.slug)
order by a.slug, a.famille;

insert into public.project_keywords (project_id, keyword_id, source)
select distinct a.project_id, k.id, 'wfg1'
from anciens a
join public.keywords k on k.slug = a.slug
on conflict (project_id, keyword_id) do nothing;
