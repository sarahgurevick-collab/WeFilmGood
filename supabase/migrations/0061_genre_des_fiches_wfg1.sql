-- =====================================================================
-- Le genre des fiches reprises de WFG 1.
--
-- Sur WFG 1, le genre était le « mot-clé principal » de la fiche : un
-- jeton « |1-N| » dans la colonne keywords (catégorie 1 = genre, N =
-- numéro dans wfg1.keywords). L'import initial ne l'avait pas repris :
-- les 5 403 fiches étaient sans genre, alors que 4 807 en avaient un.
--
-- WFG 1 proposait 37 genres, WFG 2 en a 10 : chaque ancien genre est
-- rangé dans la famille la plus proche (table ci-dessous). Quand une
-- fiche portait plusieurs genres, on garde le premier — c'était le
-- principal. Le libellé WFG 1 exact est conservé dans genre_legacy.
--
-- Les jetons à trois nombres (« |1-42-18| ») ne sont pas des genres :
-- ce sont d'autres mots-clés, ignorés ici.
-- =====================================================================

with correspondance(ancien, slug) as (
  values
    -- Drame
    (6, 'drame'), (21, 'drame'), (20, 'drame'), (22, 'drame'),
    (7, 'drame'), (8, 'drame'), (34, 'drame'), (37, 'drame'),
    -- Comédie
    (4, 'comedie'), (16, 'comedie'), (13, 'comedie'),
    -- Horreur / Science-Fiction / Fantastique
    (11, 'horreur_scifi_fantastique'), (17, 'horreur_scifi_fantastique'),
    (9, 'horreur_scifi_fantastique'), (23, 'horreur_scifi_fantastique'),
    (24, 'horreur_scifi_fantastique'), (28, 'horreur_scifi_fantastique'),
    -- Thriller & Policier
    (18, 'thriller_policier'), (10, 'thriller_policier'), (29, 'thriller_policier'),
    -- Aventure
    (1, 'aventure'), (0, 'aventure'), (15, 'aventure'), (19, 'aventure'),
    (33, 'aventure'), (12, 'aventure'), (36, 'aventure'),
    -- Histoire & Guerre
    (32, 'histoire_guerre'), (35, 'histoire_guerre'), (30, 'histoire_guerre'),
    -- Biopic
    (3, 'biopic'),
    -- Animation
    (2, 'animation'), (26, 'animation'),
    -- Documentaire
    (5, 'documentaire'),
    -- Films musicaux
    (14, 'films_musicaux'), (25, 'films_musicaux'), (31, 'films_musicaux')
),
premier_genre as (
  select
    w.project_id::text as legacy_id,
    (regexp_match(w.keywords, '\|1-([0-9]+)\|'))[1]::int as ancien
  from wfg1.projects w
  where w.keywords ~ '\|1-[0-9]+\|'
)
update public.projects p
set genre_slug = c.slug,
    genre_legacy = k.fr
from premier_genre g
join correspondance c on c.ancien = g.ancien
join wfg1.keywords k on k.category = 1 and k.keyword = g.ancien
where p.legacy_id = g.legacy_id
  and p.genre_slug is null;
