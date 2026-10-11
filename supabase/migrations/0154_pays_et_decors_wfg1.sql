-- Les pays (famille 5, « Lieu de l'action : pays ») et les décors (famille 6,
-- « Décors / Toile de fond ») des mots-clés de WFG 1, repris comme mots-clés
-- des projets (11/10/2026, Sarah : « les pays et les décors sont importants
-- aussi »). Les décors avaient été repris aux deux tiers le 22/09 ; les pays
-- n'avaient donné que projects.country (un seul par projet). On ajoute ce qui
-- manque, sans rien écraser ; les mots nouveaux reçoivent leur vecteur par
-- le rattrapage horaire. À rejouer sur la copie finale lors de la bascule.
with jetons as (
  select p.project_id as lid, t.tok
  from wfg1.projects p
  cross join lateral unnest(string_to_array(coalesce(p.keywords, '') || '|' || coalesce(p.character_keywords, ''), '|')) as t(tok)
),
liens as (
  select distinct w.category, pr.id as pid, btrim(w.fr) as fr,
    btrim(regexp_replace(lower(public.sans_accent(btrim(w.fr))), '[^a-z0-9]+', '_', 'g'), '_') as slug
  from jetons j
  join wfg1.keywords w on w.category in (5, 6) and (w.category || '-' || w.keyword) = j.tok
  join public.projects pr on pr.legacy_id::text = j.lid::text
  where btrim(coalesce(w.fr, '')) <> ''
),
nouveaux as (
  insert into public.keywords (slug, label_fr)
  select distinct l.slug, l.fr from liens l
  where not exists (select 1 from public.keywords k where k.slug = l.slug or lower(k.label_fr) = lower(l.fr))
  on conflict (slug) do nothing
  returning id
)
insert into public.project_keywords (project_id, keyword_id, source)
select distinct l.pid, k.id, 'wfg1'
from liens l
join public.keywords k on k.slug = l.slug or lower(k.label_fr) = lower(l.fr)
on conflict do nothing;

-- Les 8 projets sans pays qui en avaient un sur WFG 1.
update public.projects pr
set country = x.fr
from (
  select distinct on (pr2.id) pr2.id, btrim(w.fr) as fr
  from wfg1.projects p
  cross join lateral unnest(string_to_array(coalesce(p.keywords, ''), '|')) as t(tok)
  join wfg1.keywords w on w.category = 5 and ('5-' || w.keyword) = t.tok
  join public.projects pr2 on pr2.legacy_id::text = p.project_id::text
  where coalesce(pr2.country, '') = ''
  order by pr2.id, w.keyword
) x
where pr.id = x.id;
