-- Les 859 codes de mots-clés abîmés de WFG 1 (04/11/2026, Sarah : « reprends-les
-- tous »). Sur WFG 1, le trait entre deux mots-clés a parfois sauté :
-- « 3-2723-487 » = « 3-272 » (Jeunesse) + « 3-487 » (Mélancolie). Le dernier
-- chiffre du nombre du milieu est la famille du second mot (familles 0 à 8,
-- un seul chiffre). 858 se relisent ; « 1-271-0 » (Sourire de Flingue) renvoie
-- à un genre 27 qui n'existe pas : non repris.
--
-- Chaque mot va là où va sa famille :
--   2, 3, 4, 6 (et 5, le pays) → mots-clés de la fiche (source 'wfg1') ;
--   5 → aussi projects.country s'il est vide (jamais « Royaume-Uni », 5-0) ;
--   7 → sélections (les clés Finder sont écartées par selections_exclues) ;
--   8 → comédiens envisagés ;
--   1 → genre, seulement pour les fiches qui n'en ont pas ;
--   0 → rien (toutes ces fiches ont déjà leur format).
-- Un mot déjà posé par l'IA passe en source 'wfg1' : sinon une nouvelle passe
-- de l'IA l'effacerait (c'est ce qui est arrivé le 01/11 avec 0221).
-- Rejouable sans doublon.

create temporary table codes_abimes on commit drop as
with jetons as (
  select p.project_id::text as lid, t.tok
  from wfg1.projects p
  cross join lateral unnest(string_to_array(coalesce(p.keywords, ''), '|')) as t(tok)
  where t.tok ~ '^\d-\d{2,}-\d+$'
),
decodes as (
  select lid,
    split_part(tok, '-', 1)::int as f1,
    left(split_part(tok, '-', 2), length(split_part(tok, '-', 2)) - 1)::int as k1,
    right(split_part(tok, '-', 2), 1)::int as f2,
    split_part(tok, '-', 3)::int as k2
  from jetons
),
deux as (
  select lid, f1 as famille, k1 as numero from decodes
  union
  select lid, f2, k2 from decodes
),
dico as (
  select distinct on (category, keyword) category, keyword, btrim(fr) as fr
  from wfg1.keywords
  where coalesce(btrim(fr), '') <> ''
  order by category, keyword, keyword_id
)
select distinct pr.id as project_id, d.famille, d.numero, k.fr as libelle,
  btrim(regexp_replace(lower(public.sans_accent(k.fr)), '[^a-z0-9]+', '_', 'g'), '_') as slug
from deux d
join dico k on k.category = d.famille and k.keyword = d.numero
join public.projects pr on pr.legacy_id = d.lid
where not (d.famille = 5 and d.numero = 0);

-- Mots-clés (familles 2, 3, 4, 5, 6) : mots nouveaux, même graphie qu'en 0086.
insert into public.keywords (slug, label_fr)
select distinct on (c.slug) c.slug,
  case when substr(c.libelle, 2) ~ '[[:upper:]]' or c.famille = 5 then c.libelle
       else lower(substr(c.libelle, 1, 1)) || substr(c.libelle, 2) end
from codes_abimes c
where c.famille in (2, 3, 4, 5, 6) and c.slug <> ''
  and not exists (select 1 from public.keywords k where k.slug = c.slug)
order by c.slug, c.famille;

insert into public.project_keywords (project_id, keyword_id, source)
select distinct c.project_id, k.id, 'wfg1'
from codes_abimes c
join public.keywords k on k.slug = c.slug
where c.famille in (2, 3, 4, 5, 6)
on conflict (project_id, keyword_id) do update
  set source = 'wfg1'
  where public.project_keywords.source is null or public.project_keywords.source = 'ia';

-- Pays principal, s'il manque.
update public.projects pr
set country = x.libelle
from (
  select distinct on (project_id) project_id, libelle
  from codes_abimes where famille = 5 order by project_id, numero
) x
where pr.id = x.project_id and coalesce(pr.country, '') = '';

-- Sélections de la Maison.
insert into public.project_selections (project_id, libelle)
select distinct c.project_id, c.libelle
from codes_abimes c
where c.famille = 7
  and not exists (select 1 from public.project_selections s where s.project_id = c.project_id and s.libelle = c.libelle);

-- Comédiens envisagés.
insert into public.project_actors (project_id, libelle)
select distinct c.project_id, c.libelle
from codes_abimes c
where c.famille = 8
  and not exists (select 1 from public.project_actors a where a.project_id = c.project_id and a.libelle = c.libelle);

-- Genre, pour les fiches qui n'en ont pas (correspondance de 0061).
with correspondance(ancien, slug) as (
  values
    (6, 'drame'), (21, 'drame'), (20, 'drame'), (22, 'drame'),
    (7, 'drame'), (8, 'drame'), (34, 'drame'), (37, 'drame'),
    (4, 'comedie'), (16, 'comedie'), (13, 'comedie'),
    (11, 'horreur_scifi_fantastique'), (17, 'horreur_scifi_fantastique'),
    (9, 'horreur_scifi_fantastique'), (23, 'horreur_scifi_fantastique'),
    (24, 'horreur_scifi_fantastique'), (28, 'horreur_scifi_fantastique'),
    (18, 'thriller_policier'), (10, 'thriller_policier'), (29, 'thriller_policier'),
    (1, 'aventure'), (0, 'aventure'), (15, 'aventure'), (19, 'aventure'),
    (33, 'aventure'), (12, 'aventure'), (36, 'aventure'),
    (32, 'histoire_guerre'), (35, 'histoire_guerre'), (30, 'histoire_guerre'),
    (3, 'biopic'),
    (2, 'animation'), (26, 'animation'),
    (5, 'documentaire'),
    (14, 'films_musicaux'), (25, 'films_musicaux'), (31, 'films_musicaux')
)
update public.projects pr
set genre_slug = x.slug, genre_legacy = x.libelle
from (
  select distinct on (c.project_id) c.project_id, co.slug, c.libelle
  from codes_abimes c
  join correspondance co on co.ancien = c.numero
  where c.famille = 1
  order by c.project_id, c.numero
) x
where pr.id = x.project_id and pr.genre_slug is null;
