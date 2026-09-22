-- =====================================================================
-- Le nuage de mots-clés rapproche par le sens, plus par les lettres.
--
-- Jusqu'ici, « mots_cles_proches » classait les mots-clés par
-- ressemblance d'écriture avec ce qui est tapé : « comédie » faisait
-- remonter « compétition » (trois lettres en commun), et rien ne
-- reliait « science-fiction » à « fantastique ».
--
-- Désormais : on part des mots-clés qui correspondent au texte tapé
-- (les « graines »), on prend les projets qui les portent, et on
-- remonte les autres mots-clés de ces mêmes projets — leurs voisins de
-- fait. Un mot-clé qui accompagne souvent « science-fiction » sur les
-- fiches (« fantastique », « dystopie », « robot ») remonte ; un mot
-- qui lui ressemble seulement par l'écriture ne remonte plus.
--
-- Le score pèse le nombre de fiches communes par la part que ces
-- fiches représentent dans l'usage total du mot-clé : « amour », posé
-- sur des centaines de fiches de tous genres, ne domine pas tout ; un
-- mot-clé propre à la science-fiction passe devant.
--
-- Les familles de genres s'ajoutent aux graines : sur les fiches, une
-- histoire de science-fiction porte rarement aussi « fantastique » (7
-- fiches sur 268), alors que ce sont des voisins pour un producteur.
-- Taper un mot d'une famille (science-fiction, horreur, fantastique,
-- fantasy, anticipation…) réveille donc les autres mots de la famille.
-- Les familles sont celles des dix genres de vente.
--
-- Sans texte tapé, le nuage reste celui des mots-clés les plus posés.
-- =====================================================================

create or replace function public.mots_cles_proches(q text, p_limite int default 30)
returns table (label_fr text, effectif bigint, score real)
language sql
stable
as $$
  with terme as (
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  publics as (
    select pk.project_id, pk.keyword_id
    from public.project_keywords pk
    join public.projects p on p.id = pk.project_id
    where p.is_public
  ),
  usage_total as (
    select keyword_id, count(*) as total
    from publics
    group by keyword_id
  ),
  -- Sans texte : les mots-clés les plus posés.
  sans_texte as (
    select k.label_fr, u.total as effectif, u.total::real as score
    from usage_total u
    join public.keywords k on k.id = u.keyword_id, terme t
    where t.mot is null
    order by u.total desc
    limit p_limite
  ),
  familles(famille, mot) as (
    values
      ('horreur_scifi_fantastique', 'science-fiction'),
      ('horreur_scifi_fantastique', 'horreur'),
      ('horreur_scifi_fantastique', 'fantastique'),
      ('horreur_scifi_fantastique', 'fantasy'),
      ('horreur_scifi_fantastique', 'anticipation'),
      ('horreur_scifi_fantastique', 'épouvante'),
      ('thriller_policier', 'thriller'),
      ('thriller_policier', 'policier'),
      ('thriller_policier', 'polar'),
      ('thriller_policier', 'enquête'),
      ('histoire_guerre', 'historique'),
      ('histoire_guerre', 'histoire'),
      ('histoire_guerre', 'guerre'),
      ('films_musicaux', 'musical'),
      ('films_musicaux', 'musique'),
      ('films_musicaux', 'comédie musicale'),
      ('films_musicaux', 'opéra')
  ),
  -- Les mots de la famille du texte tapé, s'il en fait partie.
  mots_de_famille as (
    select f2.mot
    from familles f1
    join familles f2 on f2.famille = f1.famille, terme t
    where t.mot is not null and lower(t.mot) = f1.mot
  ),
  graines as (
    select k.id
    from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
    union
    select k.id
    from public.keywords k
    join mots_de_famille m on lower(k.label_fr) = m.mot
  ),
  fiches as (
    select distinct pb.project_id
    from publics pb
    join graines g on g.id = pb.keyword_id
  ),
  voisins as (
    select pb.keyword_id, count(*) as communs
    from fiches f
    join publics pb on pb.project_id = f.project_id
    group by pb.keyword_id
  ),
  avec_texte as (
    select k.label_fr,
           v.communs as effectif,
           (v.communs::real * v.communs::real / u.total::real) as score
    from voisins v
    join usage_total u on u.keyword_id = v.keyword_id
    join public.keywords k on k.id = v.keyword_id
    where v.communs >= 2 or v.keyword_id in (select id from graines)
    order by score desc, v.communs desc
    limit p_limite
  )
  select * from sans_texte
  union all
  select * from avec_texte;
$$;

grant execute on function public.mots_cles_proches(text, int) to authenticated;

notify pgrst, 'reload schema';
